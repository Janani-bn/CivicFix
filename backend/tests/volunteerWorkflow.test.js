const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const initDatabase = require('../src/config/initDatabase');
const Complaint = require('../src/models/Complaint');
const User = require('../src/models/User');
const VolunteerRequest = require('../src/models/VolunteerRequest');

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

before(async () => {
    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@example.com`;
    const volEmail = `testvol_${timestamp}@example.com`;
    const vol2Email = `testvol2_${timestamp}@example.com`;
    const citEmail = `testcit_${timestamp}@example.com`;

    // Set up designated admin env vars for test environment
    process.env.admin_name = 'Test Admin';
    process.env.admin_email = adminEmail;
    process.env.admin_pass = 'adminpass123';

    await initDatabase();
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}/api`;
            resolve();
        });
    });

    // 1. Create Admin Account via API
    const adminRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: process.env.admin_name,
            email: adminEmail,
            password: process.env.admin_pass
        })
    });
    const adminData = await adminRes.json();
    assert.strictEqual(adminRes.status, 201);
    adminToken = adminData.data.token;
    adminUser = adminData.data.user;
    assert.strictEqual(adminUser.role, 'admin');

    // 2. Create Volunteer 1 account via real workflow (Signup -> Request -> Admin Approve -> Login)
    const res1 = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Volunteer 1',
            email: volEmail,
            password: 'password123'
        })
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(data1.data.user.role, 'citizen');
    const tempVol1Token = data1.data.token;

    const req1Res = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempVol1Token}`
        }
    });
    const req1Data = await req1Res.json();
    assert.strictEqual(req1Res.status, 201);

    const app1Res = await fetch(`${baseUrl}/volunteers/${req1Data.data.request.id}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    });
    assert.strictEqual(app1Res.status, 200);

    // Fresh login after approval to get updated token
    const login1Res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: volEmail, password: 'password123' })
    });
    const login1Data = await login1Res.json();
    assert.strictEqual(login1Res.status, 200);
    assert.strictEqual(login1Data.data.user.role, 'volunteer');
    volunteerToken = login1Data.data.token;
    volunteerUser = login1Data.data.user;

    // 3. Create Volunteer 2 account via real workflow (Signup -> Request -> Admin Approve -> Login)
    const res2 = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Volunteer 2',
            email: vol2Email,
            password: 'password123'
        })
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 201);
    const tempVol2Token = data2.data.token;

    const req2Res = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tempVol2Token}`
        }
    });
    const req2Data = await req2Res.json();
    assert.strictEqual(req2Res.status, 201);

    const app2Res = await fetch(`${baseUrl}/volunteers/${req2Data.data.request.id}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    });
    assert.strictEqual(app2Res.status, 200);

    const login2Res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vol2Email, password: 'password123' })
    });
    const login2Data = await login2Res.json();
    assert.strictEqual(login2Res.status, 200);
    assert.strictEqual(login2Data.data.user.role, 'volunteer');
    volunteer2Token = login2Data.data.token;
    volunteer2User = login2Data.data.user;

    // 4. Create Citizen account
    const res3 = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Citizen',
            email: citEmail,
            password: 'password123'
        })
    });
    const data3 = await res3.json();
    assert.strictEqual(res3.status, 201);
    citizenToken = data3.data.token;
    citizenUser = data3.data.user;
    assert.strictEqual(citizenUser.role, 'citizen');
});

after(async () => {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    setTimeout(() => process.exit(0), 100);
});

test('1. Unauthorized claim request should return 401', async () => {
    const res = await fetch(`${baseUrl}/complaints/1/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('2. Authenticated non-volunteer claim request should return 403', async () => {
    const created = await Complaint.create({
        name: 'Reporter',
        phone: '1234567890',
        area: 'Anna Nagar',
        city: 'Chennai',
        issueType: 'Pothole',
        description: 'Test pothole',
        severity: 'medium'
    });

    const res = await fetch(`${baseUrl}/complaints/${created.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${citizenToken}`
        }
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('3. Authorized volunteer claim should succeed', async () => {
    testComplaint = await Complaint.create({
        name: 'Reporter 2',
        phone: '1234567890',
        area: 'T Nagar',
        city: 'Chennai',
        issueType: 'Garbage',
        description: 'Test garbage',
        severity: 'medium'
    });

    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'In Progress');
    assert.strictEqual(data.data.claimed_by_user_id, volunteerUser.id);
});

test('4. Duplicate/conflicting claim should be rejected by backend', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteer2Token}`
        }
    });
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('5. Invalid complaint state for claim should return 409', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(res.status, 409);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('6. Database persistence after claim', async () => {
    const fresh = await Complaint.findById(testComplaint.id);
    assert.strictEqual(fresh.status, 'In Progress');
    assert.strictEqual(fresh.claimed_by_user_id, volunteerUser.id);
    assert.strictEqual(fresh.claimed_by, volunteerUser.name);
});

test('7. Authorized volunteer resolution should succeed', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'Resolved');
    assert.strictEqual(data.data.resolved_by_user_id, volunteerUser.id);
});

test('8. Database persistence after resolution', async () => {
    const fresh = await Complaint.findById(testComplaint.id);
    assert.strictEqual(fresh.status, 'Resolved');
    assert.strictEqual(fresh.resolved_by_user_id, volunteerUser.id);
    assert.strictEqual(fresh.resolved_by, volunteerUser.name);
});

test('9. Invalid resolution state should return 400', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('10. Backend rejects manipulated client role', async () => {
    const res = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${citizenToken}`
        },
        body: JSON.stringify({ userRole: 'volunteer', role: 'volunteer', claimedBy: 'Hacker' })
    });
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('11. Multiple users receive the same authoritative complaint state', async () => {
    const resCit = await fetch(`${baseUrl}/complaints`);
    const dataCit = await resCit.json();
    const citTarget = dataCit.data.find((c) => c.id === testComplaint.id);
    assert.strictEqual(citTarget.status, 'Resolved');

    const resVol2 = await fetch(`${baseUrl}/complaints`, {
        headers: { 'Authorization': `Bearer ${volunteer2Token}` }
    });
    const dataVol2 = await resVol2.json();
    const vol2Target = dataVol2.data.find((c) => c.id === testComplaint.id);
    assert.strictEqual(vol2Target.status, 'Resolved');
});

test('12. Security Audit — Signup self-promotion to volunteer is rejected', async () => {
    const attemptedEmail = `hacker_signup_${Date.now()}@example.com`;
    const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Self Promoter',
            email: attemptedEmail,
            password: 'password123',
            role: 'volunteer'
        })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.data.user.role, 'citizen');

    const dbUser = await User.findByEmail(attemptedEmail);
    assert.strictEqual(dbUser.role, 'citizen');
});

test('13. Security Audit — Login self-promotion to volunteer is rejected', async () => {
    const citizenEmail = `citizen_login_${Date.now()}@example.com`;
    const resSignup = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Ordinary Citizen',
            email: citizenEmail,
            password: 'password123'
        })
    });
    const signupData = await resSignup.json();
    assert.strictEqual(signupData.data.user.role, 'citizen');

    const resLogin = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: citizenEmail,
            password: 'password123',
            role: 'volunteer'
        })
    });
    assert.strictEqual(resLogin.status, 200);
    const loginData = await resLogin.json();
    const loginToken = loginData.data.token;

    assert.strictEqual(loginData.data.user.role, 'citizen');
    const dbUser = await User.findByEmail(citizenEmail);
    assert.strictEqual(dbUser.role, 'citizen');

    const claimRes = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginToken}`
        }
    });
    assert.strictEqual(claimRes.status, 403);
});

// ISSUE #49: Complaint status update authorization

test('Issue #49. Unauthenticated status update should return 401', async () => {
    const complaint = await Complaint.create({
        name: 'Status Test User',
        phone: '1234567890',
        area: 'Test Area',
        city: 'Test City',
        issueType: 'Road',
        description: 'Issue #49 unauthenticated status test',
        severity: 'medium'
    });

    const res = await fetch(`${baseUrl}/complaints/${complaint.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'In Progress' })
    });

    assert.strictEqual(res.status, 401);
});

test('Issue #49. Non-admin status update should return 403', async () => {
    const complaint = await Complaint.create({
        name: 'Status Test User',
        phone: '1234567890',
        area: 'Test Area',
        city: 'Test City',
        issueType: 'Road',
        description: 'Issue #49 non-admin status test',
        severity: 'medium'
    });

    const res = await fetch(`${baseUrl}/complaints/${complaint.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${citizenToken}`
        },
        body: JSON.stringify({ status: 'In Progress' })
    });

    assert.strictEqual(res.status, 403);
});

test('Issue #49. Admin can update complaint status and change is persisted', async () => {
    const complaint = await Complaint.create({
        name: 'Status Test User',
        phone: '1234567890',
        area: 'Test Area',
        city: 'Test City',
        issueType: 'Road',
        description: 'Issue #49 admin status test',
        severity: 'medium'
    });

    const res = await fetch(`${baseUrl}/complaints/${complaint.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'In Progress' })
    });

    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.status, 'In Progress');

    const freshComplaint = await Complaint.findById(complaint.id);
    assert.strictEqual(freshComplaint.status, 'In Progress');
});

// NEW TESTS: VOLUNTEER ENROLLMENT & APPROVAL WORKFLOW

test('14. Volunteer Enrollment — Unauthenticated request is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('15. Volunteer Enrollment — Duplicate pending request is rejected (409)', async () => {
    const applicantEmail = `duplicatetest_${Date.now()}@example.com`;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Duplicate Applicant',
            email: applicantEmail,
            password: 'password123'
        })
    });
    const signupData = await signupRes.json();
    const userToken = signupData.data.token;

    // First request should succeed (201)
    const req1 = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
    assert.strictEqual(req1.status, 201);
    const req1Data = await req1.json();
    assert.strictEqual(req1Data.data.request.status, 'pending');

    // Second request while first is pending should fail (409)
    const req2 = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
    assert.strictEqual(req2.status, 409);
    const req2Data = await req2.json();
    assert.strictEqual(req2Data.success, false);
});

test('16. Volunteer Enrollment — Already approved volunteer requesting access returns 400', async () => {
    const res = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
});

test('17. Volunteer Enrollment — Non-admin approving request returns 403', async () => {
    const applicantEmail = `nonadmintest_${Date.now()}@example.com`;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'NonAdmin Applicant',
            email: applicantEmail,
            password: 'password123'
        })
    });
    const signupData = await signupRes.json();
    const userToken = signupData.data.token;

    const reqRes = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
    const reqData = await reqRes.json();
    const requestId = reqData.data.request.id;

    // Attempt approve using citizen token
    const appRes = await fetch(`${baseUrl}/volunteers/${requestId}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${citizenToken}`
        }
    });
    assert.strictEqual(appRes.status, 403);

    // Attempt approve using volunteer token
    const appVolRes = await fetch(`${baseUrl}/volunteers/${requestId}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(appVolRes.status, 403);
});

test('18. Volunteer Enrollment — Admin rejecting request leaves user as citizen', async () => {
    const rejectEmail = `rejecttest_${Date.now()}@example.com`;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Reject Candidate',
            email: rejectEmail,
            password: 'password123'
        })
    });
    const signupData = await signupRes.json();
    const userToken = signupData.data.token;
    const userId = signupData.data.user.id;

    const reqRes = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
    const reqData = await reqRes.json();
    const requestId = reqData.data.request.id;

    // Admin rejects request
    const rejectRes = await fetch(`${baseUrl}/volunteers/${requestId}/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    });
    assert.strictEqual(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.strictEqual(rejectData.data.request.status, 'rejected');

    // User in DB should remain citizen
    const dbUser = await User.findById(userId);
    assert.strictEqual(dbUser.role, 'citizen');

    // Attempting to claim complaint should return 403
    const claimRes = await fetch(`${baseUrl}/complaints/${testComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        }
    });
    assert.strictEqual(claimRes.status, 403);
});

test('19. End-to-End Real World Volunteer Enrollment & Complaint Management Workflow', async () => {
    const e2eEmail = `e2e_volunteer_${Date.now()}@example.com`;

    // Step 1: Register user
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'E2E Volunteer Candidate',
            email: e2eEmail,
            password: 'password123'
        })
    });
    assert.strictEqual(signupRes.status, 201);
    const signupData = await signupRes.json();

    // Step 2: Verify backend assigns citizen role
    assert.strictEqual(signupData.data.user.role, 'citizen');
    let candidateToken = signupData.data.token;
    const candidateUserId = signupData.data.user.id;

    const dbUserInitial = await User.findById(candidateUserId);
    assert.strictEqual(dbUserInitial.role, 'citizen');

    // Step 3: Login user
    const loginInitialRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e2eEmail, password: 'password123' })
    });
    assert.strictEqual(loginInitialRes.status, 200);
    const loginInitialData = await loginInitialRes.json();
    assert.strictEqual(loginInitialData.data.user.role, 'citizen');
    candidateToken = loginInitialData.data.token;

    // Step 4: Submit volunteer request
    const requestRes = await fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${candidateToken}`
        }
    });
    assert.strictEqual(requestRes.status, 201);
    const requestData = await requestRes.json();
    const requestId = requestData.data.request.id;

    // Step 5: Verify request is pending
    assert.strictEqual(requestData.data.request.status, 'pending');
    const pendingReqInDb = await VolunteerRequest.findById(requestId);
    assert.strictEqual(pendingReqInDb.status, 'pending');

    // Step 6: Create test complaint and attempt to claim as citizen
    const e2eComplaint = await Complaint.create({
        name: 'E2E Reporter',
        phone: '9876543210',
        area: 'Velachery',
        city: 'Chennai',
        issueType: 'Water Leak',
        description: 'E2E pipeline leak',
        severity: 'low'
    });

    // Step 7: Verify citizen receives 403 when claiming
    const claimForbiddenRes = await fetch(`${baseUrl}/complaints/${e2eComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${candidateToken}`
        }
    });
    assert.strictEqual(claimForbiddenRes.status, 403);

    // Step 8: Admin views pending volunteer requests
    const pendingListRes = await fetch(`${baseUrl}/volunteers/pending`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(pendingListRes.status, 200);
    const pendingListData = await pendingListRes.json();
    const foundInPending = pendingListData.data.find((r) => r.id === requestId);
    assert.ok(foundInPending, 'Pending request should be present in admin pending list');
    assert.strictEqual(foundInPending.user_email, e2eEmail);

    // Step 9: Admin approves request
    const approveRes = await fetch(`${baseUrl}/volunteers/${requestId}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        }
    });
    assert.strictEqual(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.strictEqual(approveData.data.request.status, 'approved');

    // Step 10: Verify user's role in DB becomes volunteer
    const dbUserApproved = await User.findById(candidateUserId);
    assert.strictEqual(dbUserApproved.role, 'volunteer');

    // Step 11: Login as volunteer again / obtain updated authentication
    const freshLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e2eEmail, password: 'password123' })
    });
    assert.strictEqual(freshLoginRes.status, 200);
    const freshLoginData = await freshLoginRes.json();
    assert.strictEqual(freshLoginData.data.user.role, 'volunteer');
    const freshVolunteerToken = freshLoginData.data.token;

    // Step 12: Volunteer claims complaint
    const claimSuccessRes = await fetch(`${baseUrl}/complaints/${e2eComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshVolunteerToken}`
        }
    });
    assert.strictEqual(claimSuccessRes.status, 200);
    const claimSuccessData = await claimSuccessRes.json();
    assert.strictEqual(claimSuccessData.data.status, 'In Progress');
    assert.strictEqual(claimSuccessData.data.claimed_by_user_id, candidateUserId);

    // Step 13: Verify claim is persisted in database
    const dbComplaintClaimed = await Complaint.findById(e2eComplaint.id);
    assert.strictEqual(dbComplaintClaimed.status, 'In Progress');
    assert.strictEqual(dbComplaintClaimed.claimed_by_user_id, candidateUserId);

    // Step 14: Volunteer resolves complaint
    const resolveSuccessRes = await fetch(`${baseUrl}/complaints/${e2eComplaint.id}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshVolunteerToken}`
        }
    });
    assert.strictEqual(resolveSuccessRes.status, 200);
    const resolveSuccessData = await resolveSuccessRes.json();
    assert.strictEqual(resolveSuccessData.data.status, 'Resolved');
    assert.strictEqual(resolveSuccessData.data.resolved_by_user_id, candidateUserId);

    // Step 15: Verify resolution is persisted in database
    const dbComplaintResolved = await Complaint.findById(e2eComplaint.id);
    assert.strictEqual(dbComplaintResolved.status, 'Resolved');
    assert.strictEqual(dbComplaintResolved.resolved_by_user_id, candidateUserId);

    // Step 16: Verify another volunteer cannot conflictingly claim the same complaint
    const conflictingClaimRes = await fetch(`${baseUrl}/complaints/${e2eComplaint.id}/claim`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${volunteerToken}`
        }
    });
    assert.strictEqual(conflictingClaimRes.status, 409);

    // Step 17: Reload complaint from database and verify final state remains correct
    const finalComplaintState = await Complaint.findById(e2eComplaint.id);
    assert.strictEqual(finalComplaintState.status, 'Resolved');
    assert.strictEqual(finalComplaintState.claimed_by_user_id, candidateUserId);
    assert.strictEqual(finalComplaintState.resolved_by_user_id, candidateUserId);
});

test('20. Duplicate Group Severity Calculation Tests (Issue #71)', async () => {
    const ts = Date.now();
    const tag = (str) => `${str}_${ts}`;

    // 1. high + medium -> expected high
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G1'), city: 'City G1', issueType: 'Issue Type 1', description: 'Test', severity: 'high' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G1'), city: 'City G1', issueType: 'Issue Type 1', description: 'Test', severity: 'medium' });

    // 2. medium + low -> expected medium
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G2'), city: 'City G2', issueType: 'Issue Type 2', description: 'Test', severity: 'medium' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G2'), city: 'City G2', issueType: 'Issue Type 2', description: 'Test', severity: 'low' });

    // 3. high + low -> expected high
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G3'), city: 'City G3', issueType: 'Issue Type 3', description: 'Test', severity: 'high' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G3'), city: 'City G3', issueType: 'Issue Type 3', description: 'Test', severity: 'low' });

    // 4. high + medium + low -> expected high
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G4'), city: 'City G4', issueType: 'Issue Type 4', description: 'Test', severity: 'high' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G4'), city: 'City G4', issueType: 'Issue Type 4', description: 'Test', severity: 'medium' });
    await Complaint.create({ name: 'User 3', phone: '333', area: tag('Area G4'), city: 'City G4', issueType: 'Issue Type 4', description: 'Test', severity: 'low' });

    // 5. only low -> expected low
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G5'), city: 'City G5', issueType: 'Issue Type 5', description: 'Test', severity: 'low' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G5'), city: 'City G5', issueType: 'Issue Type 5', description: 'Test', severity: 'low' });

    // 6. only medium -> expected medium
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G6'), city: 'City G6', issueType: 'Issue Type 6', description: 'Test', severity: 'medium' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G6'), city: 'City G6', issueType: 'Issue Type 6', description: 'Test', severity: 'medium' });

    // 7. only high -> expected high
    await Complaint.create({ name: 'User 1', phone: '111', area: tag('Area G7'), city: 'City G7', issueType: 'Issue Type 7', description: 'Test', severity: 'high' });
    await Complaint.create({ name: 'User 2', phone: '222', area: tag('Area G7'), city: 'City G7', issueType: 'Issue Type 7', description: 'Test', severity: 'high' });

    // Regression test: Single report should not be returned in duplicate groups
    await Complaint.create({ name: 'User Solo', phone: '999', area: tag('Area G8'), city: 'City G8', issueType: 'Issue Type Solo', description: 'Test', severity: 'high' });

    // Fetch duplicate groups directly from Model
    const modelGroups = await Complaint.getGroupedDuplicates();

    const findGroup = (areaLabel) => modelGroups.find(g => g.area.toLowerCase() === tag(areaLabel).toLowerCase());

    const group1 = findGroup('Area G1');
    assert.ok(group1, 'Group 1 should exist');
    assert.strictEqual(group1.highest_severity, 'high', 'high + medium should yield high');

    const group2 = findGroup('Area G2');
    assert.ok(group2, 'Group 2 should exist');
    assert.strictEqual(group2.highest_severity, 'medium', 'medium + low should yield medium');

    const group3 = findGroup('Area G3');
    assert.ok(group3, 'Group 3 should exist');
    assert.strictEqual(group3.highest_severity, 'high', 'high + low should yield high');

    const group4 = findGroup('Area G4');
    assert.ok(group4, 'Group 4 should exist');
    assert.strictEqual(group4.highest_severity, 'high', 'high + medium + low should yield high');

    const group5 = findGroup('Area G5');
    assert.ok(group5, 'Group 5 should exist');
    assert.strictEqual(group5.highest_severity, 'low', 'only low should yield low');

    const group6 = findGroup('Area G6');
    assert.ok(group6, 'Group 6 should exist');
    assert.strictEqual(group6.highest_severity, 'medium', 'only medium should yield medium');

    const group7 = findGroup('Area G7');
    assert.ok(group7, 'Group 7 should exist');
    assert.strictEqual(group7.highest_severity, 'high', 'only high should yield high');

    const groupSolo = findGroup('Area G8');
    assert.strictEqual(groupSolo, undefined, 'Single report should not form a duplicate group');

    // Also test via API endpoint
    const apiRes = await fetch(`${baseUrl}/complaints/grouped-duplicates`);
    assert.strictEqual(apiRes.status, 200);
    const apiBody = await apiRes.json();
    assert.strictEqual(apiBody.success, true);
    assert.ok(Array.isArray(apiBody.data));

    const findApiGroup = (areaLabel) => apiBody.data.find(g => g.area.toLowerCase() === tag(areaLabel).toLowerCase());
    assert.strictEqual(findApiGroup('Area G1').highest_severity, 'high');
    assert.strictEqual(findApiGroup('Area G2').highest_severity, 'medium');
    assert.strictEqual(findApiGroup('Area G3').highest_severity, 'high');
    assert.strictEqual(findApiGroup('Area G4').highest_severity, 'high');
    assert.strictEqual(findApiGroup('Area G5').highest_severity, 'low');
    assert.strictEqual(findApiGroup('Area G6').highest_severity, 'medium');
    assert.strictEqual(findApiGroup('Area G7').highest_severity, 'high');
    assert.strictEqual(findApiGroup('Area G8'), undefined);
});

test('21. LiveFeed Comments API & Error Handling Tests', async () => {
    const testComplaintId = `CMP-TEST-${Date.now()}`;

    // 1. GET comments for complaint with no comments -> returns empty list without fake admin comment
    const emptyRes = await fetch(`${baseUrl}/comments/${testComplaintId}`);
    assert.strictEqual(emptyRes.status, 200);
    const emptyData = await emptyRes.json();
    assert.strictEqual(emptyData.success, true);
    assert.strictEqual(emptyData.count, 0);
    assert.deepStrictEqual(emptyData.data, []);

    // 2. POST comment with invalid data (missing message) -> returns 400 status failure
    const invalidPostRes = await fetch(`${baseUrl}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: testComplaintId, message: '   ' })
    });
    assert.strictEqual(invalidPostRes.status, 400);
    const invalidPostData = await invalidPostRes.json();
    assert.strictEqual(invalidPostData.success, false);
    assert.ok(invalidPostData.error?.message);

    // 3. POST comment with valid data -> creates and returns comment
    const validPostRes = await fetch(`${baseUrl}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            complaintId: testComplaintId,
            name: 'Test Citizen',
            message: 'Valid test comment message'
        })
    });
    assert.strictEqual(validPostRes.status, 201);
    const validPostData = await validPostRes.json();
    assert.strictEqual(validPostData.success, true);
    assert.strictEqual(validPostData.data.author_name, 'Test Citizen');
    assert.strictEqual(validPostData.data.message, 'Valid test comment message');

    // 4. GET comments now returns only the posted comment, no manufacture of admin replies
    const getRes = await fetch(`${baseUrl}/comments/${testComplaintId}`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true);
    assert.strictEqual(getData.count, 1);
    assert.strictEqual(getData.data[0].message, 'Valid test comment message');
    assert.notStrictEqual(getData.data[0].author_name, 'City Admin');
});

test('22. Issue #85: Complaint Field Type Validation Tests', async () => {
    const getBasePayload = () => ({
        name: 'Citizen Reporter',
        phone: '9876543210',
        area: 'Anna Nagar',
        city: 'Chennai',
        issueType: 'Pothole',
        description: 'Large pothole on main road causing hazard'
    });

    // 1. name = number → 400
    const res1 = await fetch(`${baseUrl}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getBasePayload(), name: 42 })
    });
    assert.strictEqual(res1.status, 400);
    const data1 = await res1.json();
    assert.strictEqual(data1.success, false);
    assert.strictEqual(data1.error.message, 'Validation failed');
    assert.ok(data1.error.details.includes('Name is required'));

    // 2. name = boolean → 400
    const res2 = await fetch(`${baseUrl}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getBasePayload(), name: true })
    });
    assert.strictEqual(res2.status, 400);
    const data2 = await res2.json();
    assert.strictEqual(data2.success, false);
    assert.strictEqual(data2.error.message, 'Validation failed');
    assert.ok(data2.error.details.includes('Name is required'));

    // 3. name = object → 400
    const res3 = await fetch(`${baseUrl}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getBasePayload(), name: { first: 'John', last: 'Doe' } })
    });
    assert.strictEqual(res3.status, 400);
    const data3 = await res3.json();
    assert.strictEqual(data3.success, false);
    assert.strictEqual(data3.error.message, 'Validation failed');
    assert.ok(data3.error.details.includes('Name is required'));

    // 4. phone = non-string → 400 (number, boolean, object, array)
    const invalidPhones = [9876543210, false, { num: '9876543210' }, ['9876543210']];
    for (const invalidPhone of invalidPhones) {
        const res4 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...getBasePayload(), phone: invalidPhone })
        });
        assert.strictEqual(res4.status, 400);
        const data4 = await res4.json();
        assert.strictEqual(data4.success, false);
        assert.strictEqual(data4.error.message, 'Validation failed');
        assert.ok(data4.error.details.includes('Phone is required'));
    }

    // 5. area = non-string → 400 (number, boolean, object)
    const invalidAreas = [123, true, { area: 'Anna Nagar' }, ['Area']];
    for (const invalidArea of invalidAreas) {
        const res5 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...getBasePayload(), area: invalidArea })
        });
        assert.strictEqual(res5.status, 400);
        const data5 = await res5.json();
        assert.strictEqual(data5.success, false);
        assert.strictEqual(data5.error.message, 'Validation failed');
        assert.ok(data5.error.details.includes('Area is required'));
    }

    // 6. city = non-string → 400 (number, boolean, object)
    const invalidCities = [456, false, { city: 'Chennai' }, ['City']];
    for (const invalidCity of invalidCities) {
        const res6 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...getBasePayload(), city: invalidCity })
        });
        assert.strictEqual(res6.status, 400);
        const data6 = await res6.json();
        assert.strictEqual(data6.success, false);
        assert.strictEqual(data6.error.message, 'Validation failed');
        assert.ok(data6.error.details.includes('City is required'));
    }

    // 7. issueType = non-string → 400 (number, boolean, object)
    const invalidIssueTypes = [789, true, { issue: 'Pothole' }, ['Issue']];
    for (const invalidIssue of invalidIssueTypes) {
        const res7 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...getBasePayload(), issueType: invalidIssue })
        });
        assert.strictEqual(res7.status, 400);
        const data7 = await res7.json();
        assert.strictEqual(data7.success, false);
        assert.strictEqual(data7.error.message, 'Validation failed');
        assert.ok(data7.error.details.includes('Issue type is required'));
    }

    // 8. description = non-string → 400 (number, boolean, object)
    const invalidDescriptions = [101, false, { text: 'Some description' }, ['Desc']];
    for (const invalidDesc of invalidDescriptions) {
        const res8 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...getBasePayload(), description: invalidDesc })
        });
        assert.strictEqual(res8.status, 400);
        const data8 = await res8.json();
        assert.strictEqual(data8.success, false);
        assert.strictEqual(data8.error.message, 'Validation failed');
        assert.ok(data8.error.details.includes('Description is required'));
    }

    // 9. missing required field → existing 400 behavior
    const requiredChecks = [
        { field: 'name', expectedError: 'Name is required' },
        { field: 'phone', expectedError: 'Phone is required' },
        { field: 'area', expectedError: 'Area is required' },
        { field: 'city', expectedError: 'City is required' },
        { field: 'issueType', expectedError: 'Issue type is required' },
        { field: 'description', expectedError: 'Description is required' }
    ];
    for (const { field, expectedError } of requiredChecks) {
        const payload = getBasePayload();
        delete payload[field];
        const res9 = await fetch(`${baseUrl}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        assert.strictEqual(res9.status, 400);
        const data9 = await res9.json();
        assert.strictEqual(data9.success, false);
        assert.strictEqual(data9.error.message, 'Validation failed');
        assert.ok(data9.error.details.includes(expectedError));
    }

    // 10. valid complaint → existing success behavior
    const validPayload = getBasePayload();
    const res10 = await fetch(`${baseUrl}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
    });
    assert.strictEqual(res10.status, 201);
    const data10 = await res10.json();
    assert.strictEqual(data10.success, true);
    assert.ok(data10.data.complaintId);
    assert.strictEqual(data10.data.name, validPayload.name);
    assert.strictEqual(data10.data.phone, validPayload.phone);
    assert.strictEqual(data10.data.area, validPayload.area);
    assert.strictEqual(data10.data.city, validPayload.city);
    assert.strictEqual(data10.data.issueType, validPayload.issueType);
    assert.strictEqual(data10.data.description, validPayload.description);
});
