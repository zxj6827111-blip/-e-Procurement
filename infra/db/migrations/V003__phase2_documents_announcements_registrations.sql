-- Phase 2 formal MVP schema extension.
-- Documents, announcements, supplier invitations and registrations are modeled
-- as metadata records only. The MVP still excludes CA, e-signature,
-- encryption/decryption, trusted timestamp and real external integrations.

CREATE TABLE procurement_documents (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  version_no INTEGER NOT NULL,
  document_status VARCHAR(32) NOT NULL,
  review_status VARCHAR(32) NOT NULL,
  content_summary TEXT NOT NULL,
  attachment_metadata_json TEXT NOT NULL,
  previous_document_id VARCHAR(64) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP NULL,
  locked_at TIMESTAMP NULL
);

CREATE TABLE procurement_announcements (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  document_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_summary TEXT NOT NULL,
  announcement_scope VARCHAR(32) NOT NULL,
  announcement_status VARCHAR(32) NOT NULL,
  registration_deadline_at TIMESTAMP NOT NULL,
  quote_deadline_at TIMESTAMP NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  published_at TIMESTAMP NULL
);

CREATE TABLE supplier_invitations (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  announcement_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  invitation_status VARCHAR(32) NOT NULL,
  notification_status VARCHAR(32) NOT NULL,
  notified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE supplier_registrations (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  announcement_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  registration_status VARCHAR(32) NOT NULL,
  material_metadata_json TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL,
  qualified_at TIMESTAMP NULL,
  qualification_reason TEXT NULL
);
