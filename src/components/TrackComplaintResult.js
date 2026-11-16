import React from 'react';
import { AlertCircle, CheckCircle, Clock, MapPin, Phone, User, Calendar } from 'lucide-react';
import { statusBadgeClass } from '../utils/complaintStatus.js';
import { formatServerDate } from '../utils/dateTime.js';

const el = React.createElement;

const getStatusIcon = (status) => {
    switch (status) {
        case 'Pending':
            return el(Clock, { className: 'status-icon pending' });
        case 'In Progress':
            return el(AlertCircle, { className: 'status-icon in-progress' });
        case 'Resolved':
            return el(CheckCircle, { className: 'status-icon resolved' });
        default:
            return null;
    }
};

const infoItem = (label, value, key) =>
    el('div', { className: 'info-item', key },
        el('span', { className: 'label' }, label),
        el('span', { className: 'value' }, value));

const TrackComplaintResult = ({ complaint, imageBase = '' }) => {
    return el('div', { className: 'track-complaint__result' },
        el('div', { className: 'result-card' },
            el('div', { className: 'result-header' },
                el('div', { className: 'complaint-id' },
                    el('span', { className: 'label' }, 'Complaint ID'),
                    el('span', { className: 'value' }, complaint.complaint_id)),
                el('div', { className: `status-badge ${statusBadgeClass(complaint.status)}` },
                    getStatusIcon(complaint.status),
                    el('span', null, complaint.status))),
            el('div', { className: 'result-body' },
                el('div', { className: 'info-section' },
                    el('h3', null, 'Issue Details'),
                    el('div', { className: 'info-grid' },
                        infoItem('Issue Type', complaint.issue_type, 'type'),
                        el('div', { className: 'info-item', key: 'sev' },
                            el('span', { className: 'label' }, 'Severity'),
                            el('span', { className: `value severity-${complaint.severity}` }, complaint.severity)),
                        infoItem('Department', complaint.department, 'dept'))),
                complaint.image_url
                    ? el('div', { className: 'info-section', key: 'photo' },
                        el('h3', null, 'Evidence Photo'),
                        el('img', {
                            src: `${imageBase}${complaint.image_url}`,
                            alt: 'Uploaded issue proof',
                            style: { width: '100%', maxWidth: '400px', borderRadius: '12px', border: '1px solid #ddd', marginTop: '8px' }
                        }))
                    : null,
                el('div', { className: 'info-section' },
                    el('h3', null, 'Description'),
                    el('p', { className: 'description' }, complaint.description)),
                el('div', { className: 'info-section' },
                    el('h3', null, 'Location'),
                    el('div', { className: 'location-info' },
                        el(MapPin, { className: 'location-icon' }),
                        el('span', null, `${complaint.area}, ${complaint.city}`),
                        complaint.landmark
                            ? el('span', { className: 'landmark' }, `Near: ${complaint.landmark}`)
                            : null)),
                el('div', { className: 'info-section' },
                    el('h3', null, 'Contact Information'),
                    el('div', { className: 'contact-grid' },
                        el('div', { className: 'contact-item' },
                            el(User, { className: 'contact-icon' }),
                            el('span', null, complaint.name)),
                        el('div', { className: 'contact-item' },
                            el(Phone, { className: 'contact-icon' }),
                            el('span', null, complaint.phone)))),
                el('div', { className: 'result-footer' },
                    el('div', { className: 'timestamp' },
                        el(Calendar, { className: 'timestamp-icon' }),
                        el('span', null, `Submitted on ${formatServerDate(complaint.created_at, 'en-IN', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}`)),
                    el('div', { className: 'last-updated' },
                        `Last updated: ${formatServerDate(complaint.updated_at, 'en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}`)))),
        el('div', { className: 'status-timeline' },
            el('h3', null, 'Status Timeline'),
            el('div', { className: 'timeline' },
                el('div', { className: `timeline-item ${complaint.status === 'Pending' || complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'active' : ''}` },
                    el('div', { className: 'timeline-dot' }),
                    el('div', { className: 'timeline-content' },
                        el('h4', null, 'Complaint Received'),
                        el('p', null, 'Your complaint has been registered in our system'))),
                el('div', { className: `timeline-item ${complaint.status === 'In Progress' || complaint.status === 'Resolved' ? 'active' : ''}` },
                    el('div', { className: 'timeline-dot' }),
                    el('div', { className: 'timeline-content' },
                        el('h4', null, 'In Progress'),
                        el('p', null, `Assigned to ${complaint.department} and being reviewed`))),
                el('div', { className: `timeline-item ${complaint.status === 'Resolved' ? 'active' : ''}` },
                    el('div', { className: 'timeline-dot' }),
                    el('div', { className: 'timeline-content' },
                        el('h4', null, 'Resolved'),
                        el('p', null, 'Issue has been addressed and resolved'))))));
};

export default TrackComplaintResult;
