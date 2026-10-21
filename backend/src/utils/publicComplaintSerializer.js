const PUBLIC_COMPLAINT_FIELDS = [
    'id',
    'complaint_id',
    'issue_type',
    'description',
    'severity',
    'status',
    'department',
    'area',
    'city',
    'landmark',
    'latitude',
    'longitude',
    'image_url',
    'supporter_count',
    'allow_volunteers',
    'created_at',
    'updated_at'
];

const serializePublicComplaint = (complaint) => {
    if (!complaint) return complaint;

    return Object.fromEntries(
        PUBLIC_COMPLAINT_FIELDS
            .filter((field) =>
                Object.prototype.hasOwnProperty.call(complaint, field)
            )
            .map((field) => [field, complaint[field]])
    );
};

module.exports = { serializePublicComplaint };
