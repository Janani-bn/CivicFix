```js
const { test, before, after } = require("node:test");
const assert = require("node:assert");

const app = require("../server");
const initDatabase = require("../src/config/initDatabase");
const Complaint = require("../src/models/Complaint");
const User = require("../src/models/User");
const VolunteerRequest = require("../src/models/VolunteerRequest");

let server;
let baseUrl;

let adminToken;
let adminUser;

let volunteerToken;
let volunteerUser;

let volunteer2Token;
let volunteer2User;

let citizenToken;
let citizenUser;

let testComplaint;

/**
 * Helper for making authenticated requests.
 */
function authHeaders(token) {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

/**
 * Helper for creating a user through the API.
 */
async function signupUser(name, email, password = "password123") {
    const response = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name,
            email,
            password,
        }),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

/**
 * Helper for logging in a user.
 */
async function loginUser(email, password = "password123") {
    const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

/**
 * Helper for creating a volunteer request.
 */
async function createVolunteerRequest(token) {
    const response = await fetch(`${baseUrl}/volunteers/request`, {
        method: "POST",
        headers: authHeaders(token),
    });

    const data = await response.json();

    return {
        response,
        data,
    };
}

/**
 * Create a volunteer through the real application workflow:
 * signup -> volunteer request -> admin approval -> fresh login.
 */
async function createApprovedVolunteer(name, email) {
    const signup = await signupUser(name, email);

    assert.strictEqual(signup.response.status, 201);
    assert.strictEqual(signup.data.data.user.role, "citizen");

    const request = await createVolunteerRequest(
        signup.data.data.token
    );

    assert.strictEqual(request.response.status, 201);

    const requestId = request.data.data.request.id;

    const approvalResponse = await fetch(
        `${baseUrl}/volunteers/${requestId}/approve`,
        {
            method: "POST",
            headers: authHeaders(adminToken),
        }
    );

    assert.strictEqual(approvalResponse.status, 200);

    const login = await loginUser(email);

    assert.strictEqual(login.response.status, 200);
    assert.strictEqual(login.data.data.user.role, "volunteer");

    return {
        token: login.data.data.token,
        user: login.data.data.user,
    };
}

before(async () => {
    const timestamp = Date.now();

    const adminEmail = `admin_${timestamp}@example.com`;
    const volunteerEmail = `testvol_${timestamp}@example.com`;
    const volunteer2Email = `testvol2_${timestamp}@example.com`;
    const citizenEmail = `testcit_${timestamp}@example.com`;

    process.env.admin_name = "Test Admin";
    process.env.admin_email = adminEmail;
    process.env.admin_pass = "adminpass123";

    await initDatabase();

    server = await new Promise((resolve, reject) => {
        const instance = app.listen(0, () => resolve(instance));

        instance.on("error", reject);
    });

    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;

    // ---------------------------------------------------------
    // 1. Create Admin
    // ---------------------------------------------------------

    const adminSignup = await signupUser(
        process.env.admin_name,
        adminEmail,
        process.env.admin_pass
    );

    assert.strictEqual(adminSignup.response.status, 201);

    adminToken = adminSignup.data.data.token;
    adminUser = adminSignup.data.data.user;

    assert.strictEqual(adminUser.role, "admin");

    // ---------------------------------------------------------
    // 2. Create Volunteer 1
    // ---------------------------------------------------------

    const volunteer1 = await createApprovedVolunteer(
        "Test Volunteer 1",
        volunteerEmail
    );

    volunteerToken = volunteer1.token;
    volunteerUser = volunteer1.user;

    // ---------------------------------------------------------
    // 3. Create Volunteer 2
    // ---------------------------------------------------------

    const volunteer2 = await createApprovedVolunteer(
        "Test Volunteer 2",
        volunteer2Email
    );

    volunteer2Token = volunteer2.token;
    volunteer2User = volunteer2.user;

    // ---------------------------------------------------------
    // 4. Create Citizen
    // ---------------------------------------------------------

    const citizenSignup = await signupUser(
        "Test Citizen",
        citizenEmail
    );

    assert.strictEqual(citizenSignup.response.status, 201);

    citizenToken = citizenSignup.data.data.token;
    citizenUser = citizenSignup.data.data.user;

    assert.strictEqual(citizenUser.role, "citizen");
});

after(async () => {
    if (!server) {
        return;
    }

    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
});

// ============================================================
// COMPLAINT CLAIM / RESOLUTION TESTS
// ============================================================

test("1. Unauthorized claim request should return 401", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/1/claim`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    assert.strictEqual(response.status, 401);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("2. Authenticated non-volunteer claim request should return 403", async () => {
    const complaint = await Complaint.create({
        name: "Reporter",
        phone: "1234567890",
        area: "Anna Nagar",
        city: "Chennai",
        issueType: "Pothole",
        description: "Test pothole",
        severity: "medium",
    });

    const response = await fetch(
        `${baseUrl}/complaints/${complaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(citizenToken),
        }
    );

    assert.strictEqual(response.status, 403);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("3. Authorized volunteer claim should succeed", async () => {
    testComplaint = await Complaint.create({
        name: "Reporter 2",
        phone: "1234567890",
        area: "T Nagar",
        city: "Chennai",
        issueType: "Garbage",
        description: "Test garbage",
        severity: "medium",
    });

    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, "In Progress");
    assert.strictEqual(
        data.data.claimed_by_user_id,
        volunteerUser.id
    );
});

test("4. Duplicate/conflicting claim should be rejected by backend", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(volunteer2Token),
        }
    );

    assert.strictEqual(response.status, 409);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("5. Invalid complaint state for claim should return 409", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(response.status, 409);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("6. Database persistence after claim", async () => {
    const complaint = await Complaint.findById(testComplaint.id);

    assert.ok(complaint);
    assert.strictEqual(complaint.status, "In Progress");
    assert.strictEqual(
        complaint.claimed_by_user_id,
        volunteerUser.id
    );
    assert.strictEqual(
        complaint.claimed_by,
        volunteerUser.name
    );
});

test("7. Authorized volunteer resolution should succeed", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/resolve`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, "Resolved");
    assert.strictEqual(
        data.data.resolved_by_user_id,
        volunteerUser.id
    );
});

test("8. Database persistence after resolution", async () => {
    const complaint = await Complaint.findById(testComplaint.id);

    assert.ok(complaint);
    assert.strictEqual(complaint.status, "Resolved");
    assert.strictEqual(
        complaint.resolved_by_user_id,
        volunteerUser.id
    );
    assert.strictEqual(
        complaint.resolved_by,
        volunteerUser.name
    );
});

test("9. Invalid resolution state should return 400", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/resolve`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(response.status, 400);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("10. Backend rejects manipulated client role", async () => {
    const response = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(citizenToken),
            body: JSON.stringify({
                userRole: "volunteer",
                role: "volunteer",
                claimedBy: "Hacker",
            }),
        }
    );

    assert.strictEqual(response.status, 403);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("11. Multiple users receive the same authoritative complaint state", async () => {
    const citizenResponse = await fetch(
        `${baseUrl}/complaints`
    );

    const citizenData = await citizenResponse.json();

    assert.strictEqual(citizenResponse.status, 200);

    const citizenComplaint = citizenData.data.find(
        (complaint) => complaint.id === testComplaint.id
    );

    assert.ok(citizenComplaint);
    assert.strictEqual(
        citizenComplaint.status,
        "Resolved"
    );

    const volunteerResponse = await fetch(
        `${baseUrl}/complaints`,
        {
            headers: {
                Authorization: `Bearer ${volunteer2Token}`,
            },
        }
    );

    const volunteerData = await volunteerResponse.json();

    assert.strictEqual(volunteerResponse.status, 200);

    const volunteerComplaint = volunteerData.data.find(
        (complaint) => complaint.id === testComplaint.id
    );

    assert.ok(volunteerComplaint);
    assert.strictEqual(
        volunteerComplaint.status,
        "Resolved"
    );
});

// ============================================================
// SECURITY TESTS
// ============================================================

test("12. Security Audit — Signup self-promotion to volunteer is rejected", async () => {
    const email = `hacker_signup_${Date.now()}@example.com`;

    const response = await fetch(
        `${baseUrl}/auth/signup`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "Self Promoter",
                email,
                password: "password123",
                role: "volunteer",
            }),
        }
    );

    assert.strictEqual(response.status, 201);

    const data = await response.json();

    assert.strictEqual(data.data.user.role, "citizen");

    const dbUser = await User.findByEmail(email);

    assert.ok(dbUser);
    assert.strictEqual(dbUser.role, "citizen");
});

test("13. Security Audit — Login self-promotion to volunteer is rejected", async () => {
    const email = `citizen_login_${Date.now()}@example.com`;

    const signup = await signupUser(
        "Ordinary Citizen",
        email
    );

    assert.strictEqual(signup.response.status, 201);
    assert.strictEqual(
        signup.data.data.user.role,
        "citizen"
    );

    const response = await fetch(
        `${baseUrl}/auth/login`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password: "password123",
                role: "volunteer",
            }),
        }
    );

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.strictEqual(data.data.user.role, "citizen");

    const dbUser = await User.findByEmail(email);

    assert.ok(dbUser);
    assert.strictEqual(dbUser.role, "citizen");

    const claimResponse = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(data.data.token),
        }
    );

    assert.strictEqual(claimResponse.status, 403);
});

// ============================================================
// ISSUE #49 — COMPLAINT STATUS AUTHORIZATION
// ============================================================

test("Issue #49. Unauthenticated status update should return 401", async () => {
    const complaint = await Complaint.create({
        name: "Status Test User",
        phone: "1234567890",
        area: "Test Area",
        city: "Test City",
        issueType: "Road",
        description: "Issue #49 unauthenticated status test",
        severity: "medium",
    });

    const response = await fetch(
        `${baseUrl}/complaints/${complaint.id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                status: "In Progress",
            }),
        }
    );

    assert.strictEqual(response.status, 401);
});

test("Issue #49. Non-admin status update should return 403", async () => {
    const complaint = await Complaint.create({
        name: "Status Test User",
        phone: "1234567890",
        area: "Test Area",
        city: "Test City",
        issueType: "Road",
        description: "Issue #49 non-admin status test",
        severity: "medium",
    });

    const response = await fetch(
        `${baseUrl}/complaints/${complaint.id}`,
        {
            method: "PUT",
            headers: authHeaders(citizenToken),
            body: JSON.stringify({
                status: "In Progress",
            }),
        }
    );

    assert.strictEqual(response.status, 403);
});

test("Issue #49. Admin can update complaint status and change is persisted", async () => {
    const complaint = await Complaint.create({
        name: "Status Test User",
        phone: "1234567890",
        area: "Test Area",
        city: "Test City",
        issueType: "Road",
        description: "Issue #49 admin status test",
        severity: "medium",
    });

    const response = await fetch(
        `${baseUrl}/complaints/${complaint.id}`,
        {
            method: "PUT",
            headers: authHeaders(adminToken),
            body: JSON.stringify({
                status: "In Progress",
            }),
        }
    );

    assert.strictEqual(response.status, 200);

    const data = await response.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(
        data.data.status,
        "In Progress"
    );

    const freshComplaint = await Complaint.findById(
        complaint.id
    );

    assert.ok(freshComplaint);
    assert.strictEqual(
        freshComplaint.status,
        "In Progress"
    );
});

// ============================================================
// VOLUNTEER ENROLLMENT
// ============================================================

test("14. Volunteer Enrollment — Unauthenticated request is rejected (401)", async () => {
    const response = await fetch(
        `${baseUrl}/volunteers/request`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    assert.strictEqual(response.status, 401);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("15. Volunteer Enrollment — Duplicate pending request is rejected (409)", async () => {
    const email = `duplicatetest_${Date.now()}@example.com`;

    const signup = await signupUser(
        "Duplicate Applicant",
        email
    );

    assert.strictEqual(signup.response.status, 201);

    const token = signup.data.data.token;

    const firstRequest = await createVolunteerRequest(token);

    assert.strictEqual(firstRequest.response.status, 201);
    assert.strictEqual(
        firstRequest.data.data.request.status,
        "pending"
    );

    const secondRequest = await createVolunteerRequest(token);

    assert.strictEqual(secondRequest.response.status, 409);
    assert.strictEqual(
        secondRequest.data.success,
        false
    );
});

test("16. Volunteer Enrollment — Already approved volunteer requesting access returns 400", async () => {
    const response = await fetch(
        `${baseUrl}/volunteers/request`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(response.status, 400);

    const data = await response.json();

    assert.strictEqual(data.success, false);
});

test("17. Volunteer Enrollment — Non-admin approving request returns 403", async () => {
    const email = `nonadmintest_${Date.now()}@example.com`;

    const signup = await signupUser(
        "NonAdmin Applicant",
        email
    );

    assert.strictEqual(signup.response.status, 201);

    const request = await createVolunteerRequest(
        signup.data.data.token
    );

    assert.strictEqual(request.response.status, 201);

    const requestId = request.data.data.request.id;

    const citizenApproval = await fetch(
        `${baseUrl}/volunteers/${requestId}/approve`,
        {
            method: "POST",
            headers: authHeaders(citizenToken),
        }
    );

    assert.strictEqual(citizenApproval.status, 403);

    const volunteerApproval = await fetch(
        `${baseUrl}/volunteers/${requestId}/approve`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(volunteerApproval.status, 403);
});

test("18. Volunteer Enrollment — Admin rejecting request leaves user as citizen", async () => {
    const email = `rejecttest_${Date.now()}@example.com`;

    const signup = await signupUser(
        "Reject Candidate",
        email
    );

    assert.strictEqual(signup.response.status, 201);

    const token = signup.data.data.token;
    const userId = signup.data.data.user.id;

    const request = await createVolunteerRequest(token);

    assert.strictEqual(request.response.status, 201);

    const requestId = request.data.data.request.id;

    const rejectResponse = await fetch(
        `${baseUrl}/volunteers/${requestId}/reject`,
        {
            method: "POST",
            headers: authHeaders(adminToken),
        }
    );

    assert.strictEqual(rejectResponse.status, 200);

    const rejectData = await rejectResponse.json();

    assert.strictEqual(
        rejectData.data.request.status,
        "rejected"
    );

    const dbUser = await User.findById(userId);

    assert.ok(dbUser);
    assert.strictEqual(dbUser.role, "citizen");

    const claimResponse = await fetch(
        `${baseUrl}/complaints/${testComplaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(token),
        }
    );

    assert.strictEqual(claimResponse.status, 403);
});

// ============================================================
// END-TO-END VOLUNTEER WORKFLOW
// ============================================================

test("19. End-to-End Real World Volunteer Enrollment & Complaint Management Workflow", async () => {
    const email = `e2e_volunteer_${Date.now()}@example.com`;

    // Step 1: Register
    const signup = await signupUser(
        "E2E Volunteer Candidate",
        email
    );

    assert.strictEqual(signup.response.status, 201);
    assert.strictEqual(
        signup.data.data.user.role,
        "citizen"
    );

    const candidateUserId = signup.data.data.user.id;

    // Step 2: Verify database role
    const initialUser = await User.findById(candidateUserId);

    assert.ok(initialUser);
    assert.strictEqual(initialUser.role, "citizen");

    // Step 3: Login
    const initialLogin = await loginUser(email);

    assert.strictEqual(initialLogin.response.status, 200);
    assert.strictEqual(
        initialLogin.data.data.user.role,
        "citizen"
    );

    const candidateToken = initialLogin.data.data.token;

    // Step 4: Submit volunteer request
    const request = await createVolunteerRequest(
        candidateToken
    );

    assert.strictEqual(request.response.status, 201);

    const requestId = request.data.data.request.id;

    // Step 5: Verify pending request
    assert.strictEqual(
        request.data.data.request.status,
        "pending"
    );

    const pendingRequest =
        await VolunteerRequest.findById(requestId);

    assert.ok(pendingRequest);
    assert.strictEqual(
        pendingRequest.status,
        "pending"
    );

    // Step 6: Create complaint
    const complaint = await Complaint.create({
        name: "E2E Reporter",
        phone: "9876543210",
        area: "Velachery",
        city: "Chennai",
        issueType: "Water Leak",
        description: "E2E pipeline leak",
        severity: "low",
    });

    // Step 7: Citizen cannot claim
    const forbiddenClaim = await fetch(
        `${baseUrl}/complaints/${complaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(candidateToken),
        }
    );

    assert.strictEqual(forbiddenClaim.status, 403);

    // Step 8: Admin views pending requests
    const pendingResponse = await fetch(
        `${baseUrl}/volunteers/pending`,
        {
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        }
    );

    assert.strictEqual(pendingResponse.status, 200);

    const pendingData = await pendingResponse.json();

    const foundRequest = pendingData.data.find(
        (requestItem) => requestItem.id === requestId
    );

    assert.ok(
        foundRequest,
        "Pending request should be present in admin pending list"
    );

    assert.strictEqual(
        foundRequest.user_email,
        email
    );

    // Step 9: Admin approves
    const approvalResponse = await fetch(
        `${baseUrl}/volunteers/${requestId}/approve`,
        {
            method: "POST",
            headers: authHeaders(adminToken),
        }
    );

    assert.strictEqual(approvalResponse.status, 200);

    const approvalData = await approvalResponse.json();

    assert.strictEqual(
        approvalData.data.request.status,
        "approved"
    );

    // Step 10: Verify role
    const approvedUser = await User.findById(
        candidateUserId
    );

    assert.ok(approvedUser);
    assert.strictEqual(
        approvedUser.role,
        "volunteer"
    );

    // Step 11: Login again
    const volunteerLogin = await loginUser(email);

    assert.strictEqual(
        volunteerLogin.response.status,
        200
    );

    assert.strictEqual(
        volunteerLogin.data.data.user.role,
        "volunteer"
    );

    const freshVolunteerToken =
        volunteerLogin.data.data.token;

    // Step 12: Volunteer claims complaint
    const claimResponse = await fetch(
        `${baseUrl}/complaints/${complaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(freshVolunteerToken),
        }
    );

    assert.strictEqual(claimResponse.status, 200);

    const claimData = await claimResponse.json();

    assert.strictEqual(
        claimData.data.status,
        "In Progress"
    );

    assert.strictEqual(
        claimData.data.claimed_by_user_id,
        candidateUserId
    );

    // Step 13: Verify claim persistence
    const claimedComplaint =
        await Complaint.findById(complaint.id);

    assert.ok(claimedComplaint);

    assert.strictEqual(
        claimedComplaint.status,
        "In Progress"
    );

    assert.strictEqual(
        claimedComplaint.claimed_by_user_id,
        candidateUserId
    );

    // Step 14: Resolve complaint
    const resolveResponse = await fetch(
        `${baseUrl}/complaints/${complaint.id}/resolve`,
        {
            method: "POST",
            headers: authHeaders(freshVolunteerToken),
        }
    );

    assert.strictEqual(resolveResponse.status, 200);

    const resolveData = await resolveResponse.json();

    assert.strictEqual(
        resolveData.data.status,
        "Resolved"
    );

    assert.strictEqual(
        resolveData.data.resolved_by_user_id,
        candidateUserId
    );

    // Step 15: Verify resolution persistence
    const resolvedComplaint =
        await Complaint.findById(complaint.id);

    assert.ok(resolvedComplaint);

    assert.strictEqual(
        resolvedComplaint.status,
        "Resolved"
    );

    assert.strictEqual(
        resolvedComplaint.resolved_by_user_id,
        candidateUserId
    );

    // Step 16: Another volunteer cannot claim it
    const conflictingClaim = await fetch(
        `${baseUrl}/complaints/${complaint.id}/claim`,
        {
            method: "POST",
            headers: authHeaders(volunteerToken),
        }
    );

    assert.strictEqual(
        conflictingClaim.status,
        409
    );

    // Step 17: Verify final state
    const finalComplaint =
        await Complaint.findById(complaint.id);

    assert.ok(finalComplaint);

    assert.strictEqual(
        finalComplaint.status,
        "Resolved"
    );

    assert.strictEqual(
        finalComplaint.claimed_by_user_id,
        candidateUserId
    );

    assert.strictEqual(
        finalComplaint.resolved_by_user_id,
        candidateUserId
    );
});

// ============================================================
// ISSUE #71 — DUPLICATE GROUP SEVERITY
// ============================================================

test("20. Duplicate Group Severity Calculation Tests (Issue #71)", async () => {
    const timestamp = Date.now();

    const tag = (value) => `${value}_${timestamp}`;

    const createComplaint = async (
        area,
        city,
        issueType,
        severity
    ) => {
        return Complaint.create({
            name: "Test User",
            phone: "111",
            area: tag(area),
            city,
            issueType,
            description: "Test",
            severity,
        });
    };

    await createComplaint(
        "Area G1",
        "City G1",
        "Issue Type 1",
        "high"
    );

    await createComplaint(
        "Area G1",
        "City G1",
        "Issue Type 1",
        "medium"
    );

    await createComplaint(
        "Area G2",
        "City G2",
        "Issue Type 2",
        "medium"
    );

    await createComplaint(
        "Area G2",
        "City G2",
        "Issue Type 2",
        "low"
    );

    await createComplaint(
        "Area G3",
        "City G3",
        "Issue Type 3",
        "high"
    );

    await createComplaint(
        "Area G3",
        "City G3",
        "Issue Type 3",
        "low"
    );

    await createComplaint(
        "Area G4",
        "City G4",
        "Issue Type 4",
        "high"
    );

    await createComplaint(
        "Area G4",
        "City G4",
        "Issue Type 4",
        "medium"
    );

    await createComplaint(
        "Area G4",
        "City G4",
        "Issue Type 4",
        "low"
    );

    await createComplaint(
        "Area G5",
        "City G5",
        "Issue Type 5",
        "low"
    );

    await createComplaint(
        "Area G5",
        "City G5",
        "Issue Type 5",
        "low"
    );

    await createComplaint(
        "Area G6",
        "City G6",
        "Issue Type 6",
        "medium"
    );

    await createComplaint(
        "Area G6",
        "City G6",
        "Issue Type 6",
        "medium"
    );

    await createComplaint(
        "Area G7",
        "City G7",
        "Issue Type 7",
        "high"
    );

    await createComplaint(
        "Area G7",
        "City G7",
        "Issue Type 7",
        "high"
    );

    // A single complaint should not form a duplicate group.
    await createComplaint(
        "Area G8",
        "City G8",
        "Issue Type Solo",
        "high"
    );

    const modelGroups =
        await Complaint.getGroupedDuplicates();

    const findGroup = (area) =>
        modelGroups.find(
            (group) =>
                group.area.toLowerCase() ===
                tag(area).toLowerCase()
        );

    const group1 = findGroup("Area G1");
    assert.ok(group1);
    assert.strictEqual(
        group1.highest_severity,
        "high"
    );

    const group2 = findGroup("Area G2");
    assert.ok(group2);
    assert.strictEqual(
        group2.highest_severity,
        "medium"
    );

    const group3 = findGroup("Area G3");
    assert.ok(group3);
    assert.strictEqual(
        group3.highest_severity,
        "high"
    );

    const group4 = findGroup("Area G4");
    assert.ok(group4);
    assert.strictEqual(
        group4.highest_severity,
        "high"
    );

    const group5 = findGroup("Area G5");
    assert.ok(group5);
    assert.strictEqual(
        group5.highest_severity,
        "low"
    );

    const group6 = findGroup("Area G6");
    assert.ok(group6);
    assert.strictEqual(
        group6.highest_severity,
        "medium"
    );

    const group7 = findGroup("Area G7");
    assert.ok(group7);
    assert.strictEqual(
        group7.highest_severity,
        "high"
    );

    const group8 = findGroup("Area G8");

    assert.strictEqual(
        group8,
        undefined
    );

    // Verify through API.
    const apiResponse = await fetch(
        `${baseUrl}/complaints/grouped-duplicates`
    );

    assert.strictEqual(apiResponse.status, 200);

    const apiData = await apiResponse.json();

    assert.strictEqual(apiData.success, true);
    assert.ok(Array.isArray(apiData.data));

    const findApiGroup = (area) =>
        apiData.data.find(
            (group) =>
                group.area.toLowerCase() ===
                tag(area).toLowerCase()
        );

    assert.strictEqual(
        findApiGroup("Area G1").highest_severity,
        "high"
    );

    assert.strictEqual(
        findApiGroup("Area G2").highest_severity,
        "medium"
    );

    assert.strictEqual(
        findApiGroup("Area G3").highest_severity,
        "high"
    );

    assert.strictEqual(
        findApiGroup("Area G4").highest_severity,
        "high"
    );

    assert.strictEqual(
        findApiGroup("Area G5").highest_severity,
        "low"
    );

    assert.strictEqual(
        findApiGroup("Area G6").highest_severity,
        "medium"
    );

    assert.strictEqual(
        findApiGroup("Area G7").highest_severity,
        "high"
    );

    assert.strictEqual(
        findApiGroup("Area G8"),
        undefined
    );
});

// ============================================================
// ISSUE — LIVEFEED COMMENTS
// ============================================================

test("21. LiveFeed Comments API & Error Handling Tests", async () => {
    const complaintId = `CMP-TEST-${Date.now()}`;

    // GET comments when there are no comments.
    const emptyResponse = await fetch(
        `${baseUrl}/comments/${complaintId}`
    );

    assert.strictEqual(emptyResponse.status, 200);

    const emptyData = await emptyResponse.json();

    assert.strictEqual(emptyData.success, true);
    assert.strictEqual(emptyData.count, 0);
    assert.deepStrictEqual(emptyData.data, []);

    // POST invalid comment.
    const invalidResponse = await fetch(
        `${baseUrl}/comments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                complaintId,
                message: "   ",
            }),
        }
    );

    assert.strictEqual(invalidResponse.status, 400);

    const invalidData = await invalidResponse.json();

    assert.strictEqual(invalidData.success, false);
    assert.ok(invalidData.error?.message);

    // POST valid comment.
    const validResponse = await fetch(
        `${baseUrl}/comments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                complaintId,
                name: "Test Citizen",
                message: "Valid test comment message",
            }),
        }
    );

    assert.strictEqual(validResponse.status, 201);

    const validData = await validResponse.json();

    assert.strictEqual(validData.success, true);
    assert.strictEqual(
        validData.data.author_name,
        "Test Citizen"
    );
    assert.strictEqual(
        validData.data.message,
        "Valid test comment message"
    );

    // GET comments after creating one.
    const getResponse = await fetch(
        `${baseUrl}/comments/${complaintId}`
    );

    assert.strictEqual(getResponse.status, 200);

    const getData = await getResponse.json();

    assert.strictEqual(getData.success, true);
    assert.strictEqual(getData.count, 1);

    assert.strictEqual(
        getData.data[0].message,
        "Valid test comment message"
    );

    assert.notStrictEqual(
        getData.data[0].author_name,
        "City Admin"
    );
});

// ============================================================
// ISSUE #85 — COMPLAINT FIELD TYPE VALIDATION
// ============================================================

test("22. Issue #85: Complaint Field Type Validation Tests", async () => {
    const getBasePayload = () => ({
        name: "Citizen Reporter",
        phone: "9876543210",
        area: "Anna Nagar",
        city: "Chennai",
        issueType: "Pothole",
        description:
            "Large pothole on main road causing hazard",
    });

    // name = number
    const nameNumberResponse = await fetch(
        `${baseUrl}/complaints`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...getBasePayload(),
                name: 42,
            }),
        }
    );

    assert.strictEqual(nameNumberResponse.status, 400);

    const nameNumberData =
        await nameNumberResponse.json();

    assert.strictEqual(
        nameNumberData.success,
        false
    );

    assert.strictEqual(
        nameNumberData.error.message,
        "Validation failed"
    );

    assert.ok(
        nameNumberData.error.details.includes(
            "Name is required"
        )
    );

    // name = boolean
    const nameBooleanResponse = await fetch(
        `${baseUrl}/complaints`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...getBasePayload(),
                name: true,
            }),
        }
    );

    assert.strictEqual(
        nameBooleanResponse.status,
        400
    );

    const nameBooleanData =
        await nameBooleanResponse.json();

    assert.strictEqual(
        nameBooleanData.success,
        false
    );

    assert.strictEqual(
        nameBooleanData.error.message,
        "Validation failed"
    );

    assert.ok(
        nameBooleanData.error.details.includes(
            "Name is required"
        )
    );

    // name = object
    const nameObjectResponse = await fetch(
        `${baseUrl}/complaints`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...getBasePayload(),
                name: {
                    first: "John",
                    last: "Doe",
                },
            }),
        }
    );

    assert.strictEqual(
        nameObjectResponse.status,
        400
    );

    const nameObjectData =
        await nameObjectResponse.json();

    assert.strictEqual(
        nameObjectData.success,
        false
    );

    assert.strictEqual(
        nameObjectData.error.message,
        "Validation failed"
    );

    assert.ok(
        nameObjectData.error.details.includes(
            "Name is required"
        )
    );

    // phone = invalid types
    const invalidPhones = [
        9876543210,
        false,
        { num: "9876543210" },
        ["9876543210"],
    ];

    for (const phone of invalidPhones) {
        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...getBasePayload(),
                    phone,
                }),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                "Phone is required"
            )
        );
    }

    // area = invalid types
    const invalidAreas = [
        123,
        true,
        { area: "Anna Nagar" },
        ["Area"],
    ];

    for (const area of invalidAreas) {
        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...getBasePayload(),
                    area,
                }),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                "Area is required"
            )
        );
    }

    // city = invalid types
    const invalidCities = [
        456,
        false,
        { city: "Chennai" },
        ["City"],
    ];

    for (const city of invalidCities) {
        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...getBasePayload(),
                    city,
                }),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                "City is required"
            )
        );
    }

    // issueType = invalid types
    const invalidIssueTypes = [
        789,
        true,
        { issue: "Pothole" },
        ["Issue"],
    ];

    for (const issueType of invalidIssueTypes) {
        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...getBasePayload(),
                    issueType,
                }),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                "Issue type is required"
            )
        );
    }

    // description = invalid types
    const invalidDescriptions = [
        101,
        false,
        { text: "Some description" },
        ["Desc"],
    ];

    for (const description of invalidDescriptions) {
        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...getBasePayload(),
                    description,
                }),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                "Description is required"
            )
        );
    }

    // Missing required fields.
    const requiredChecks = [
        {
            field: "name",
            expectedError: "Name is required",
        },
        {
            field: "phone",
            expectedError: "Phone is required",
        },
        {
            field: "area",
            expectedError: "Area is required",
        },
        {
            field: "city",
            expectedError: "City is required",
        },
        {
            field: "issueType",
            expectedError: "Issue type is required",
        },
        {
            field: "description",
            expectedError: "Description is required",
        },
    ];

    for (const {
        field,
        expectedError,
    } of requiredChecks) {
        const payload = getBasePayload();

        delete payload[field];

        const response = await fetch(
            `${baseUrl}/complaints`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        );

        assert.strictEqual(response.status, 400);

        const data = await response.json();

        assert.strictEqual(data.success, false);
        assert.strictEqual(
            data.error.message,
            "Validation failed"
        );

        assert.ok(
            data.error.details.includes(
                expectedError
            )
        );
    }

    // Valid complaint.
    const validPayload = getBasePayload();

    const validResponse = await fetch(
        `${baseUrl}/complaints`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(validPayload),
        }
    );

    assert.strictEqual(validResponse.status, 201);

    const validData = await validResponse.json();

    assert.strictEqual(validData.success, true);

    assert.ok(validData.data.complaintId);

    assert.strictEqual(
        validData.data.name,
        validPayload.name
    );

    assert.strictEqual(
        validData.data.phone,
        validPayload.phone
    );

    assert.strictEqual(
        validData.data.area,
        validPayload.area
    );

    assert.strictEqual(
        validData.data.city,
        validPayload.city
    );

    assert.strictEqual(
        validData.data.issueType,
        validPayload.issueType
    );

    assert.strictEqual(
        validData.data.description,
        validPayload.description
    );
});
```
