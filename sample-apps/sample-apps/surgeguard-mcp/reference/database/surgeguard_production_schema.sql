-- Care360 Surge Command / SurgeGuard
-- Production PostgreSQL schema for a policy-gated emergency surge planner.
-- Target: PostgreSQL 16+. Multi-tenant, append-audited, FHIR-integrated, MCP-ready.
-- Store only minimum operational PHI. Store secret/KMS references, never raw credentials.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS terminology;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS capacity;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS incident;
CREATE SCHEMA IF NOT EXISTS policy;
CREATE SCHEMA IF NOT EXISTS planning;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS mcp;
CREATE SCHEMA IF NOT EXISTS comms;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE DOMAIN core.nonempty_text AS text CHECK (btrim(VALUE) <> '');
CREATE DOMAIN core.percentage AS numeric(7,4) CHECK (VALUE BETWEEN 0 AND 100);
CREATE DOMAIN core.probability AS numeric(9,8) CHECK (VALUE BETWEEN 0 AND 1);
CREATE DOMAIN core.sha256_hex AS text CHECK (VALUE ~ '^[0-9a-fA-F]{64}$');

CREATE TYPE core.record_status AS ENUM ('draft','active','inactive','retired','archived');
CREATE TYPE core.severity_level AS ENUM ('info','low','medium','high','critical');
CREATE TYPE core.approval_status AS ENUM ('pending','approved','rejected','cancelled','expired','superseded');
CREATE TYPE core.execution_status AS ENUM ('queued','running','succeeded','failed','cancelled','timed_out','partial');
CREATE TYPE core.data_classification AS ENUM ('public','internal','confidential','restricted','phi');
CREATE TYPE core.direction AS ENUM ('inbound','outbound');
CREATE TYPE core.action_kind AS ENUM ('create','read','update','delete','execute','export','approve','override');
CREATE TYPE core.actor_kind AS ENUM ('user','service_account','api_client','system','external');
CREATE TYPE core.source_kind AS ENUM ('manual','ehr','fhir','hl7v2','csv','api','sensor','derived','optimizer','mcp');
CREATE TYPE core.constraint_strength AS ENUM ('hard','soft','advisory');
CREATE TYPE core.violation_status AS ENUM ('open','acknowledged','remediated','accepted','dismissed');
CREATE TYPE core.isolation_category AS ENUM ('none','standard','contact','droplet','airborne','protective','custom');
CREATE TYPE core.bed_state AS ENUM ('available','occupied','held','cleaning','blocked','closed','unknown');
CREATE TYPE core.shift_status AS ENUM ('planned','offered','accepted','declined','checked_in','completed','cancelled','no_show');
CREATE TYPE core.plan_status AS ENUM ('draft','evaluating','blocked','eligible','pending_approval','approved','rejected','executing','completed','cancelled','superseded');
CREATE TYPE core.incident_status AS ENUM ('planned','monitoring','activated','stabilizing','demobilizing','closed','cancelled');
CREATE TYPE core.task_status AS ENUM ('draft','ready','in_progress','on_hold','completed','failed','cancelled');
CREATE TYPE core.message_status AS ENUM ('draft','queued','sent','delivered','failed','cancelled');

CREATE OR REPLACE FUNCTION core.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  IF to_jsonb(NEW) ? 'row_version' THEN NEW.row_version := COALESCE(OLD.row_version,0)+1; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION core.app_tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT NULLIF(current_setting('app.tenant_id', true),'')::uuid $$;
CREATE OR REPLACE FUNCTION core.app_actor_id() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT NULLIF(current_setting('app.actor_id', true),'')::uuid $$;
CREATE OR REPLACE FUNCTION core.app_purpose_of_use() RETURNS text LANGUAGE sql STABLE AS $$
SELECT NULLIF(current_setting('app.purpose_of_use', true),'') $$;

-- CORE
CREATE TABLE core.tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug citext NOT NULL UNIQUE,
 legal_name core.nonempty_text NOT NULL, display_name core.nonempty_text NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', default_timezone text NOT NULL DEFAULT 'UTC',
 default_locale text NOT NULL DEFAULT 'en-US', data_region text, kms_key_reference text,
 settings jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1
);
CREATE TABLE core.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 parent_organization_id uuid REFERENCES core.organizations(id), organization_type text NOT NULL,
 legal_name core.nonempty_text NOT NULL, display_name core.nonempty_text NOT NULL, status core.record_status NOT NULL DEFAULT 'active',
 npi text, accreditation_body text, accreditation_identifier text, effective_from timestamptz, effective_to timestamptz,
 metadata jsonb NOT NULL DEFAULT '{}', created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from), UNIQUE(tenant_id,id)
);
CREATE TABLE core.organization_identifiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE, system_uri text NOT NULL,
 identifier_value text NOT NULL, identifier_value_hash core.sha256_hex, identifier_type text, use_code text,
 valid_from timestamptz, valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,system_uri,identifier_value)
);
CREATE TABLE core.organization_relationships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_organization_id uuid NOT NULL REFERENCES core.organizations(id), target_organization_id uuid NOT NULL REFERENCES core.organizations(id),
 relationship_type text NOT NULL, valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz,
 terms jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(source_organization_id<>target_organization_id), CHECK(valid_to IS NULL OR valid_to>valid_from)
);
CREATE TABLE core.facilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES core.organizations(id), parent_facility_id uuid REFERENCES core.facilities(id),
 facility_code citext NOT NULL, facility_type text NOT NULL, name core.nonempty_text NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', timezone text NOT NULL, trauma_level text, teaching_status text,
 licensed_bed_count integer CHECK(licensed_bed_count>=0), staffed_bed_count integer CHECK(staffed_bed_count>=0),
 latitude numeric(9,6), longitude numeric(9,6), metadata jsonb NOT NULL DEFAULT '{}', created_by uuid, updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,facility_code), UNIQUE(tenant_id,id)
);
CREATE TABLE core.addresses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 entity_type text NOT NULL, entity_id uuid NOT NULL, use_code text, line1 text, line2 text, city text, district text,
 state_region text, postal_code text, country_code char(2), latitude numeric(9,6), longitude numeric(9,6),
 valid_from timestamptz, valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX addresses_entity_idx ON core.addresses(tenant_id,entity_type,entity_id);
CREATE TABLE core.contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 entity_type text NOT NULL, entity_id uuid NOT NULL, contact_type text NOT NULL, contact_value_encrypted bytea,
 contact_value_hash core.sha256_hex, use_code text, priority smallint NOT NULL DEFAULT 1 CHECK(priority>0),
 verified_at timestamptz, valid_from timestamptz, valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE core.departments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), parent_department_id uuid REFERENCES core.departments(id),
 code citext NOT NULL, name core.nonempty_text NOT NULL, department_type text NOT NULL, cost_center_code text,
 status core.record_status NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,facility_id,code)
);
CREATE TABLE core.service_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name core.nonempty_text NOT NULL, description text, status core.record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,code)
);
CREATE TABLE core.department_service_lines (
 tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE, department_id uuid NOT NULL REFERENCES core.departments(id) ON DELETE CASCADE,
 service_line_id uuid NOT NULL REFERENCES core.service_lines(id) ON DELETE CASCADE, is_primary boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(department_id,service_line_id)
);
CREATE TABLE core.configurations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid REFERENCES core.facilities(id) ON DELETE CASCADE, namespace citext NOT NULL, config_key citext NOT NULL,
 config_value jsonb NOT NULL, is_secret_reference boolean NOT NULL DEFAULT false, valid_from timestamptz NOT NULL DEFAULT now(),
 valid_to timestamptz, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT(tenant_id,facility_id,namespace,config_key,valid_from)
);
CREATE TABLE core.retention_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 data_category text NOT NULL, jurisdiction text, retention_days integer NOT NULL CHECK(retention_days>0),
 disposition_action text NOT NULL CHECK(disposition_action IN('delete','anonymize','archive','review')),
 legal_basis text, status core.record_status NOT NULL DEFAULT 'active', valid_from timestamptz NOT NULL DEFAULT now(),
 valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,data_category,jurisdiction,valid_from)
);

-- IAM
CREATE TABLE iam.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 username citext NOT NULL, display_name text NOT NULL, email_encrypted bytea, email_hash core.sha256_hex,
 phone_encrypted bytea, status core.record_status NOT NULL DEFAULT 'active', preferred_locale text, preferred_timezone text,
 last_login_at timestamptz, password_auth_disabled boolean NOT NULL DEFAULT true, mfa_required boolean NOT NULL DEFAULT true,
 attributes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,username), UNIQUE(tenant_id,id)
);
CREATE TABLE iam.user_identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE, issuer text NOT NULL, subject text NOT NULL,
 identity_type text NOT NULL DEFAULT 'oidc', claims_snapshot jsonb NOT NULL DEFAULT '{}', linked_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz, UNIQUE(tenant_id,issuer,subject)
);
CREATE TABLE iam.service_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name citext NOT NULL, description text, status core.record_status NOT NULL DEFAULT 'active', owner_user_id uuid REFERENCES iam.users(id),
 credential_reference text, allowed_audiences text[] NOT NULL DEFAULT '{}', expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,name), UNIQUE(tenant_id,id)
);
CREATE TABLE iam.oauth_clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 client_id text NOT NULL, client_name text NOT NULL, client_type text NOT NULL CHECK(client_type IN('public','confidential','service')),
 status core.record_status NOT NULL DEFAULT 'active', token_endpoint_auth_method text, jwks_uri text, jwks jsonb,
 allowed_grant_types text[] NOT NULL DEFAULT '{}', allowed_scopes text[] NOT NULL DEFAULT '{}', credential_reference text,
 metadata_document_uri text, redirect_uris text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,client_id), UNIQUE(tenant_id,id)
);
CREATE TABLE iam.api_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 principal_kind core.actor_kind NOT NULL, principal_id uuid NOT NULL, key_prefix text NOT NULL, key_hash core.sha256_hex NOT NULL,
 name text NOT NULL, scopes text[] NOT NULL DEFAULT '{}', expires_at timestamptz, revoked_at timestamptz, last_used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,key_hash)
);
CREATE TABLE iam.roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, description text, is_system boolean NOT NULL DEFAULT false,
 status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,code)
);
CREATE TABLE iam.permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), permission_key citext NOT NULL UNIQUE, resource_type text NOT NULL,
 action core.action_kind NOT NULL, description text NOT NULL, is_phi_access boolean NOT NULL DEFAULT false,
 requires_purpose_of_use boolean NOT NULL DEFAULT false
);
CREATE TABLE iam.role_permissions (
 role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE, permission_id uuid NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
 conditions jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(role_id,permission_id)
);
CREATE TABLE iam.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE, role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
 facility_id uuid REFERENCES core.facilities(id) ON DELETE CASCADE, department_id uuid REFERENCES core.departments(id) ON DELETE CASCADE,
 valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz, granted_by uuid REFERENCES iam.users(id), grant_reason text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT(user_id,role_id,facility_id,department_id,valid_from)
);
CREATE TABLE iam.data_scopes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scope_key citext NOT NULL, scope_type text NOT NULL, expression jsonb NOT NULL, description text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,scope_key)
);
CREATE TABLE iam.principal_scopes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 principal_kind core.actor_kind NOT NULL, principal_id uuid NOT NULL, data_scope_id uuid NOT NULL REFERENCES iam.data_scopes(id) ON DELETE CASCADE,
 valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(principal_kind,principal_id,data_scope_id,valid_from)
);
CREATE TABLE iam.delegations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 delegator_user_id uuid NOT NULL REFERENCES iam.users(id), delegate_user_id uuid NOT NULL REFERENCES iam.users(id),
 scope jsonb NOT NULL, reason text NOT NULL, valid_from timestamptz NOT NULL, valid_to timestamptz NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK(delegator_user_id<>delegate_user_id), CHECK(valid_to>valid_from)
);
CREATE TABLE iam.break_glass_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES iam.users(id), facility_id uuid REFERENCES core.facilities(id), reason_code text NOT NULL,
 reason_text text NOT NULL, requested_scope jsonb NOT NULL, approved_by uuid REFERENCES iam.users(id), started_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, ended_at timestamptz, review_status core.approval_status NOT NULL DEFAULT 'pending',
 reviewed_by uuid REFERENCES iam.users(id), reviewed_at timestamptz, review_notes text, CHECK(expires_at>started_at)
);
CREATE TABLE iam.sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid REFERENCES iam.users(id) ON DELETE CASCADE, service_account_id uuid REFERENCES iam.service_accounts(id) ON DELETE CASCADE,
 oauth_client_id uuid REFERENCES iam.oauth_clients(id) ON DELETE CASCADE, token_jti_hash core.sha256_hex, auth_strength text,
 ip_address inet, user_agent text, started_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, revoke_reason text, CHECK(num_nonnulls(user_id,service_account_id)=1)
);
CREATE TABLE iam.auth_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE SET NULL,
 user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL, service_account_id uuid REFERENCES iam.service_accounts(id) ON DELETE SET NULL,
 event_type text NOT NULL, outcome text NOT NULL, ip_address inet, user_agent text, details jsonb NOT NULL DEFAULT '{}',
 occurred_at timestamptz NOT NULL DEFAULT now()
);

-- TERMINOLOGY
CREATE TABLE terminology.code_systems (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uri text NOT NULL, version text NOT NULL DEFAULT '', name text, title text,
 publisher text, status core.record_status NOT NULL DEFAULT 'active', content_mode text, license_text text, imported_at timestamptz,
 metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(uri,version)
);
CREATE TABLE terminology.concepts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code_system_id uuid NOT NULL REFERENCES terminology.code_systems(id) ON DELETE CASCADE,
 code text NOT NULL, display text, definition text, parent_concept_id uuid REFERENCES terminology.concepts(id),
 status core.record_status NOT NULL DEFAULT 'active', properties jsonb NOT NULL DEFAULT '{}', UNIQUE(code_system_id,code)
);
CREATE INDEX concepts_display_trgm_idx ON terminology.concepts USING gin(display gin_trgm_ops);
CREATE TABLE terminology.value_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uri text NOT NULL, version text NOT NULL DEFAULT '', name text, title text,
 status core.record_status NOT NULL DEFAULT 'active', compose_definition jsonb NOT NULL DEFAULT '{}', expansion_timestamp timestamptz,
 UNIQUE(uri,version)
);
CREATE TABLE terminology.value_set_members (
 value_set_id uuid NOT NULL REFERENCES terminology.value_sets(id) ON DELETE CASCADE,
 concept_id uuid NOT NULL REFERENCES terminology.concepts(id) ON DELETE CASCADE, included boolean NOT NULL DEFAULT true,
 PRIMARY KEY(value_set_id,concept_id)
);
CREATE TABLE terminology.concept_maps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), uri text NOT NULL, version text NOT NULL DEFAULT '', name text,
 source_system_uri text, target_system_uri text, status core.record_status NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(uri,version)
);
CREATE TABLE terminology.concept_map_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), concept_map_id uuid NOT NULL REFERENCES terminology.concept_maps(id) ON DELETE CASCADE,
 source_code text NOT NULL, target_code text NOT NULL, equivalence text NOT NULL, comment text,
 depends_on jsonb NOT NULL DEFAULT '[]', product jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE terminology.local_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code_set citext NOT NULL, code citext NOT NULL, display text NOT NULL, definition text,
 status core.record_status NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(tenant_id,code_set,code)
);
CREATE TABLE terminology.local_code_mappings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 local_code_id uuid NOT NULL REFERENCES terminology.local_codes(id) ON DELETE CASCADE, target_system_uri text NOT NULL,
 target_code text NOT NULL, equivalence text NOT NULL, confidence core.probability, reviewed_by uuid REFERENCES iam.users(id),
 reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- WORKFORCE
CREATE TABLE workforce.practitioners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL, display_name text NOT NULL, legal_name_encrypted bytea,
 birth_date_encrypted bytea, status core.record_status NOT NULL DEFAULT 'active', practitioner_type text NOT NULL,
 home_facility_id uuid REFERENCES core.facilities(id), source_kind core.source_kind NOT NULL DEFAULT 'ehr',
 external_last_updated_at timestamptz, attributes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,id)
);
CREATE TABLE workforce.practitioner_identifiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, system_uri text NOT NULL,
 identifier_value_encrypted bytea, identifier_value_hash core.sha256_hex NOT NULL, identifier_type text, use_code text,
 valid_from timestamptz, valid_to timestamptz, UNIQUE(tenant_id,system_uri,identifier_value_hash)
);
CREATE TABLE workforce.employments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES core.organizations(id), facility_id uuid REFERENCES core.facilities(id),
 employment_type text NOT NULL, employee_number_hash core.sha256_hex, fte numeric(5,4) CHECK(fte BETWEEN 0 AND 2),
 union_code text, hire_date date, termination_date date, status core.record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(termination_date IS NULL OR hire_date IS NULL OR termination_date>=hire_date)
);
CREATE TABLE workforce.role_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, role_family text NOT NULL, description text,
 minimum_experience_months integer CHECK(minimum_experience_months>=0), status core.record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,code)
);
CREATE TABLE workforce.role_capabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 role_definition_id uuid NOT NULL REFERENCES workforce.role_definitions(id) ON DELETE CASCADE, capability_code text NOT NULL,
 proficiency_min smallint CHECK(proficiency_min BETWEEN 1 AND 5), required boolean NOT NULL DEFAULT true,
 metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(role_definition_id,capability_code)
);
CREATE TABLE workforce.practitioner_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 role_definition_id uuid NOT NULL REFERENCES workforce.role_definitions(id), organization_id uuid REFERENCES core.organizations(id),
 facility_id uuid REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id), specialty_code text,
 status core.record_status NOT NULL DEFAULT 'active', valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz,
 source_kind core.source_kind NOT NULL DEFAULT 'ehr', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE NULLS NOT DISTINCT(practitioner_id,role_definition_id,facility_id,department_id,valid_from)
);
CREATE TABLE workforce.licenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, license_type text NOT NULL,
 issuing_authority text NOT NULL, jurisdiction text NOT NULL, license_number_encrypted bytea,
 license_number_hash core.sha256_hex NOT NULL, status text NOT NULL, issued_on date, expires_on date,
 verified_at timestamptz, verification_source text, restrictions jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,issuing_authority,jurisdiction,license_number_hash)
);
CREATE TABLE workforce.certifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, certification_code text NOT NULL,
 issuer text NOT NULL, credential_number_hash core.sha256_hex, issued_on date, expires_on date, status text NOT NULL,
 verified_at timestamptz, evidence_file_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workforce.competency_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, description text, proficiency_scale jsonb NOT NULL DEFAULT '{}',
 renewal_interval_days integer CHECK(renewal_interval_days>0), status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE workforce.practitioner_competencies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 competency_definition_id uuid NOT NULL REFERENCES workforce.competency_definitions(id),
 proficiency_level smallint NOT NULL CHECK(proficiency_level BETWEEN 1 AND 5), assessed_on date NOT NULL, expires_on date,
 assessor_practitioner_id uuid REFERENCES workforce.practitioners(id), evidence jsonb NOT NULL DEFAULT '{}',
 status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(practitioner_id,competency_definition_id,assessed_on)
);
CREATE TABLE workforce.privilege_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, procedure_or_service_code text, facility_scope_required boolean NOT NULL DEFAULT true,
 status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE workforce.practitioner_privileges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 privilege_definition_id uuid NOT NULL REFERENCES workforce.privilege_definitions(id), facility_id uuid REFERENCES core.facilities(id),
 department_id uuid REFERENCES core.departments(id), status text NOT NULL, valid_from timestamptz NOT NULL, valid_to timestamptz,
 granted_by uuid REFERENCES workforce.practitioners(id), restrictions jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(valid_to IS NULL OR valid_to>valid_from)
);
CREATE TABLE workforce.practitioner_restrictions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, restriction_type text NOT NULL,
 severity core.severity_level NOT NULL, details_encrypted bytea, valid_from timestamptz NOT NULL, valid_to timestamptz,
 imposed_by text, source_reference text, status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workforce.availability_windows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, facility_id uuid REFERENCES core.facilities(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 availability_type text NOT NULL CHECK(availability_type IN('available','preferred','unavailable','on_call')),
 source_kind core.source_kind NOT NULL DEFAULT 'manual', notes text, created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE workforce.leave_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, leave_type text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status core.approval_status NOT NULL DEFAULT 'approved',
 details_encrypted bytea, created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE workforce.shifts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id),
 role_definition_id uuid NOT NULL REFERENCES workforce.role_definitions(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 minimum_headcount integer NOT NULL DEFAULT 1 CHECK(minimum_headcount>=0), target_headcount integer NOT NULL DEFAULT 1,
 maximum_headcount integer, surge_shift boolean NOT NULL DEFAULT false, status core.record_status NOT NULL DEFAULT 'active',
 source_reference text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 row_version bigint NOT NULL DEFAULT 1, CHECK(ends_at>starts_at), CHECK(target_headcount>=minimum_headcount),
 CHECK(maximum_headcount IS NULL OR maximum_headcount>=target_headcount)
);
CREATE TABLE workforce.shift_requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 shift_id uuid NOT NULL REFERENCES workforce.shifts(id) ON DELETE CASCADE, requirement_type text NOT NULL,
 requirement_code text NOT NULL, minimum_count integer NOT NULL DEFAULT 1 CHECK(minimum_count>=1),
 minimum_proficiency smallint CHECK(minimum_proficiency BETWEEN 1 AND 5), hard_requirement boolean NOT NULL DEFAULT true,
 UNIQUE(shift_id,requirement_type,requirement_code)
);
CREATE TABLE workforce.shift_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 shift_id uuid NOT NULL REFERENCES workforce.shifts(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id), assignment_role_id uuid REFERENCES workforce.role_definitions(id),
 status core.shift_status NOT NULL DEFAULT 'planned', assigned_by uuid REFERENCES iam.users(id), assignment_source text NOT NULL DEFAULT 'manual',
 offered_at timestamptz, responded_at timestamptz, checked_in_at timestamptz, checked_out_at timestamptz,
 overtime_minutes integer NOT NULL DEFAULT 0 CHECK(overtime_minutes>=0), waiver_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(shift_id,practitioner_id)
);
CREATE TABLE workforce.fatigue_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE, observed_at timestamptz NOT NULL,
 consecutive_work_minutes integer CHECK(consecutive_work_minutes>=0), rolling_24h_work_minutes integer CHECK(rolling_24h_work_minutes>=0),
 rolling_7d_work_minutes integer CHECK(rolling_7d_work_minutes>=0), rest_minutes_since_last_shift integer CHECK(rest_minutes_since_last_shift>=0),
 risk_level core.severity_level NOT NULL, calculation_details jsonb NOT NULL, source_kind core.source_kind NOT NULL DEFAULT 'derived',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workforce.staffing_pools (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid REFERENCES core.facilities(id), name text NOT NULL, pool_type text NOT NULL,
 activation_lead_minutes integer CHECK(activation_lead_minutes>=0), status core.record_status NOT NULL DEFAULT 'active',
 rules jsonb NOT NULL DEFAULT '{}', UNIQUE NULLS NOT DISTINCT(tenant_id,facility_id,name)
);
CREATE TABLE workforce.staffing_pool_memberships (
 staffing_pool_id uuid NOT NULL REFERENCES workforce.staffing_pools(id) ON DELETE CASCADE,
 practitioner_id uuid NOT NULL REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 priority integer NOT NULL DEFAULT 100, valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz,
 PRIMARY KEY(staffing_pool_id,practitioner_id,valid_from)
);
CREATE TABLE workforce.agency_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 vendor_organization_id uuid NOT NULL REFERENCES core.organizations(id), facility_id uuid REFERENCES core.facilities(id),
 contract_reference text, starts_on date NOT NULL, ends_on date, role_rates jsonb NOT NULL DEFAULT '{}',
 credential_requirements jsonb NOT NULL DEFAULT '{}', response_sla_minutes integer, status core.record_status NOT NULL DEFAULT 'active',
 CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE workforce.on_call_rosters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id),
 role_definition_id uuid NOT NULL REFERENCES workforce.role_definitions(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 primary_practitioner_id uuid REFERENCES workforce.practitioners(id), backup_practitioner_id uuid REFERENCES workforce.practitioners(id),
 escalation_minutes integer NOT NULL DEFAULT 10 CHECK(escalation_minutes>0), created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);

-- CAPACITY
CREATE TABLE capacity.locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), parent_location_id uuid REFERENCES capacity.locations(id),
 department_id uuid REFERENCES core.departments(id), location_code citext NOT NULL, name text NOT NULL, location_type text NOT NULL,
 physical_type text, status core.record_status NOT NULL DEFAULT 'active', operational_status text, floor_label text, zone_label text,
 fire_compartment text, negative_pressure_capable boolean NOT NULL DEFAULT false, oxygen_available boolean NOT NULL DEFAULT false,
 suction_available boolean NOT NULL DEFAULT false, telemetry_available boolean NOT NULL DEFAULT false,
 bariatric_capable boolean NOT NULL DEFAULT false, pediatric_capable boolean NOT NULL DEFAULT false,
 accessibility_attributes jsonb NOT NULL DEFAULT '{}', geo jsonb NOT NULL DEFAULT '{}', source_kind core.source_kind NOT NULL DEFAULT 'ehr',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,facility_id,location_code), UNIQUE(tenant_id,id)
);
CREATE TABLE capacity.location_capabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES capacity.locations(id) ON DELETE CASCADE, capability_code text NOT NULL,
 capability_value jsonb NOT NULL DEFAULT '{}', valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz,
 verified_at timestamptz, source_kind core.source_kind NOT NULL DEFAULT 'manual', UNIQUE(location_id,capability_code,valid_from)
);
CREATE TABLE capacity.beds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES capacity.locations(id), bed_code citext NOT NULL, bed_type text NOT NULL,
 licensed boolean NOT NULL DEFAULT true, staffed_by_default boolean NOT NULL DEFAULT true, state core.bed_state NOT NULL DEFAULT 'unknown',
 gender_restriction text, weight_limit_kg numeric(8,2), infection_use_restrictions jsonb NOT NULL DEFAULT '[]',
 status core.record_status NOT NULL DEFAULT 'active', source_kind core.source_kind NOT NULL DEFAULT 'ehr',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,location_id,bed_code), UNIQUE(tenant_id,id)
);
CREATE TABLE capacity.bed_capabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES capacity.beds(id) ON DELETE CASCADE, capability_code text NOT NULL,
 capability_value jsonb NOT NULL DEFAULT '{}', valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz,
 UNIQUE(bed_id,capability_code,valid_from)
);
CREATE TABLE capacity.capacity_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), location_id uuid REFERENCES capacity.locations(id), name text NOT NULL,
 care_level text NOT NULL, normal_capacity integer NOT NULL CHECK(normal_capacity>=0),
 contingency_capacity integer NOT NULL, crisis_capacity integer NOT NULL, minimum_staffing_ratio numeric(10,4),
 maximum_occupancy_percentage core.percentage, status core.record_status NOT NULL DEFAULT 'active',
 valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz, assumptions jsonb NOT NULL DEFAULT '{}',
 CHECK(contingency_capacity>=normal_capacity), CHECK(crisis_capacity>=contingency_capacity),
 UNIQUE NULLS NOT DISTINCT(tenant_id,facility_id,location_id,name,valid_from)
);
CREATE TABLE capacity.capacity_windows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 capacity_profile_id uuid NOT NULL REFERENCES capacity.capacity_profiles(id) ON DELETE CASCADE,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, licensed_capacity integer CHECK(licensed_capacity>=0),
 staffed_capacity integer CHECK(staffed_capacity>=0), operational_capacity integer CHECK(operational_capacity>=0),
 reserved_capacity integer NOT NULL DEFAULT 0 CHECK(reserved_capacity>=0), unavailable_capacity integer NOT NULL DEFAULT 0 CHECK(unavailable_capacity>=0),
 reason text, source_kind core.source_kind NOT NULL DEFAULT 'derived', created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE capacity.bed_status_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES capacity.beds(id) ON DELETE CASCADE, prior_state core.bed_state, new_state core.bed_state NOT NULL,
 reason_code text, occurred_at timestamptz NOT NULL, source_kind core.source_kind NOT NULL DEFAULT 'ehr',
 source_reference text, actor_id uuid, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bed_status_events_bed_time_idx ON capacity.bed_status_events(bed_id,occurred_at DESC);
CREATE TABLE capacity.bed_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES capacity.beds(id), patient_id uuid NOT NULL, encounter_id uuid,
 starts_at timestamptz NOT NULL, ends_at timestamptz, assignment_type text NOT NULL DEFAULT 'occupancy',
 source_kind core.source_kind NOT NULL DEFAULT 'ehr', source_reference text, created_at timestamptz NOT NULL DEFAULT now(),
 EXCLUDE USING gist(bed_id WITH =, tstzrange(starts_at,COALESCE(ends_at,'infinity'::timestamptz),'[)') WITH &&)
);
CREATE TABLE capacity.bed_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES capacity.beds(id), hold_type text NOT NULL, patient_id uuid, encounter_id uuid,
 starts_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, released_at timestamptz, reason text NOT NULL,
 created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), CHECK(expires_at>starts_at)
);
CREATE TABLE capacity.bed_turnovers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 bed_id uuid NOT NULL REFERENCES capacity.beds(id), triggered_at timestamptz NOT NULL, cleaning_type text NOT NULL,
 required_precautions jsonb NOT NULL DEFAULT '[]', assigned_team text, started_at timestamptz, completed_at timestamptz,
 verified_at timestamptz, verified_by uuid, status core.task_status NOT NULL DEFAULT 'ready', delay_reason text, source_reference text
);
CREATE TABLE capacity.environmental_constraints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES capacity.locations(id) ON DELETE CASCADE, constraint_type text NOT NULL,
 severity core.severity_level NOT NULL, details jsonb NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz,
 status core.record_status NOT NULL DEFAULT 'active', source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacity.surge_spaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), location_id uuid REFERENCES capacity.locations(id), name text NOT NULL,
 surge_space_type text NOT NULL, base_capacity integer NOT NULL DEFAULT 0 CHECK(base_capacity>=0), maximum_capacity integer NOT NULL,
 care_levels text[] NOT NULL DEFAULT '{}', activation_lead_minutes integer NOT NULL DEFAULT 0 CHECK(activation_lead_minutes>=0),
 deactivation_lead_minutes integer NOT NULL DEFAULT 0 CHECK(deactivation_lead_minutes>=0),
 infrastructure_requirements jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(maximum_capacity>=base_capacity), UNIQUE(tenant_id,facility_id,name)
);
CREATE TABLE capacity.surge_space_prerequisites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 surge_space_id uuid NOT NULL REFERENCES capacity.surge_spaces(id) ON DELETE CASCADE, prerequisite_type text NOT NULL,
 prerequisite_code text NOT NULL, required_quantity numeric(14,4), hard_requirement boolean NOT NULL DEFAULT true,
 lead_minutes integer NOT NULL DEFAULT 0 CHECK(lead_minutes>=0), evidence_requirement text,
 UNIQUE(surge_space_id,prerequisite_type,prerequisite_code)
);
CREATE TABLE capacity.device_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, category text NOT NULL, capabilities jsonb NOT NULL DEFAULT '{}',
 preventive_maintenance_interval_days integer, status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE capacity.devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 device_type_id uuid NOT NULL REFERENCES capacity.device_types(id), facility_id uuid REFERENCES core.facilities(id),
 location_id uuid REFERENCES capacity.locations(id), asset_tag citext, serial_number_encrypted bytea, serial_number_hash core.sha256_hex,
 manufacturer text, model text, status text NOT NULL, availability_status text NOT NULL, last_maintenance_at timestamptz,
 next_maintenance_at timestamptz, source_kind core.source_kind NOT NULL DEFAULT 'ehr', metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE NULLS NOT DISTINCT(tenant_id,asset_tag)
);
CREATE TABLE capacity.device_status_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES capacity.devices(id) ON DELETE CASCADE, prior_status text, new_status text NOT NULL,
 reason text, occurred_at timestamptz NOT NULL, actor_id uuid, source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacity.device_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES capacity.devices(id), patient_id uuid, encounter_id uuid,
 location_id uuid REFERENCES capacity.locations(id), assigned_at timestamptz NOT NULL, released_at timestamptz,
 assignment_reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacity.inventory_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 sku citext NOT NULL, name text NOT NULL, category text NOT NULL, unit_of_measure text NOT NULL,
 criticality core.severity_level NOT NULL DEFAULT 'medium', substitutable boolean NOT NULL DEFAULT false,
 substitute_group text, cold_chain_required boolean NOT NULL DEFAULT false, controlled_item boolean NOT NULL DEFAULT false,
 status core.record_status NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(tenant_id,sku)
);
CREATE TABLE capacity.inventory_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 inventory_item_id uuid NOT NULL REFERENCES capacity.inventory_items(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 location_id uuid REFERENCES capacity.locations(id), lot_number text, serial_number text, expires_on date,
 quantity_on_hand numeric(16,4) NOT NULL DEFAULT 0 CHECK(quantity_on_hand>=0),
 quantity_reserved numeric(16,4) NOT NULL DEFAULT 0 CHECK(quantity_reserved>=0),
 quantity_quarantined numeric(16,4) NOT NULL DEFAULT 0 CHECK(quantity_quarantined>=0),
 status text NOT NULL DEFAULT 'available', last_counted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacity.inventory_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 inventory_item_id uuid NOT NULL REFERENCES capacity.inventory_items(id), lot_id uuid REFERENCES capacity.inventory_lots(id),
 facility_id uuid NOT NULL REFERENCES core.facilities(id), from_location_id uuid REFERENCES capacity.locations(id),
 to_location_id uuid REFERENCES capacity.locations(id), movement_type text NOT NULL,
 quantity numeric(16,4) NOT NULL CHECK(quantity>0), unit_of_measure text NOT NULL, occurred_at timestamptz NOT NULL,
 source_reference text, actor_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacity.par_levels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 inventory_item_id uuid NOT NULL REFERENCES capacity.inventory_items(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 location_id uuid REFERENCES capacity.locations(id), minimum_quantity numeric(16,4) NOT NULL CHECK(minimum_quantity>=0),
 target_quantity numeric(16,4) NOT NULL, critical_quantity numeric(16,4) NOT NULL CHECK(critical_quantity>=0),
 reorder_lead_minutes integer, surge_multiplier numeric(8,4) NOT NULL DEFAULT 1 CHECK(surge_multiplier>0),
 valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz, CHECK(target_quantity>=minimum_quantity),
 UNIQUE NULLS NOT DISTINCT(inventory_item_id,facility_id,location_id,valid_from)
);
CREATE TABLE capacity.vendors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES core.organizations(id), vendor_code citext NOT NULL, name text NOT NULL,
 emergency_contact_encrypted bytea, response_sla_minutes integer, status core.record_status NOT NULL DEFAULT 'active',
 capabilities jsonb NOT NULL DEFAULT '{}', UNIQUE(tenant_id,vendor_code)
);
CREATE TABLE capacity.purchase_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 vendor_id uuid NOT NULL REFERENCES capacity.vendors(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 order_number citext NOT NULL, status text NOT NULL, ordered_at timestamptz, expected_at timestamptz,
 emergency_order boolean NOT NULL DEFAULT false, total_amount numeric(18,2), currency_code char(3), source_reference text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,order_number)
);
CREATE TABLE capacity.purchase_order_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 purchase_order_id uuid NOT NULL REFERENCES capacity.purchase_orders(id) ON DELETE CASCADE,
 inventory_item_id uuid NOT NULL REFERENCES capacity.inventory_items(id), quantity numeric(16,4) NOT NULL CHECK(quantity>0),
 unit_price numeric(18,4), quantity_received numeric(16,4) NOT NULL DEFAULT 0 CHECK(quantity_received>=0), expected_at timestamptz
);

-- CLINICAL SHADOW MODEL
CREATE TABLE clinical.patients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 display_label text NOT NULL, legal_name_encrypted bytea, date_of_birth_encrypted bytea, sex_at_birth_code text,
 administrative_gender_code text, deceased boolean NOT NULL DEFAULT false, vip_restricted boolean NOT NULL DEFAULT false,
 status core.record_status NOT NULL DEFAULT 'active', source_kind core.source_kind NOT NULL DEFAULT 'ehr',
 source_last_updated_at timestamptz, attributes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,id)
);
CREATE TABLE clinical.patient_identifiers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE, system_uri text NOT NULL, identifier_type text,
 identifier_value_encrypted bytea, identifier_value_hash core.sha256_hex NOT NULL, use_code text, valid_from timestamptz,
 valid_to timestamptz, UNIQUE(tenant_id,system_uri,identifier_value_hash)
);
CREATE TABLE clinical.encounters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 department_id uuid REFERENCES core.departments(id), encounter_class text NOT NULL, encounter_type text, service_type text,
 status text NOT NULL, priority_code text, arrival_mode text, admission_source text, started_at timestamptz NOT NULL,
 expected_end_at timestamptz, ended_at timestamptz, attending_practitioner_id uuid REFERENCES workforce.practitioners(id),
 current_location_id uuid REFERENCES capacity.locations(id), current_bed_id uuid REFERENCES capacity.beds(id),
 source_kind core.source_kind NOT NULL DEFAULT 'ehr', source_reference text, source_last_updated_at timestamptz,
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,source_kind,source_reference), UNIQUE(tenant_id,id)
);
CREATE TABLE clinical.encounter_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, status text NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz, reason_code text, source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.acuity_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, assessment_system text NOT NULL,
 acuity_level text NOT NULL, score numeric(10,4), assessed_at timestamptz NOT NULL,
 assessed_by_practitioner_id uuid REFERENCES workforce.practitioners(id), factors jsonb NOT NULL DEFAULT '{}',
 source_kind core.source_kind NOT NULL DEFAULT 'ehr', source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.triage_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, triage_category text NOT NULL,
 chief_complaint_encrypted bytea, triaged_at timestamptz NOT NULL,
 triaged_by_practitioner_id uuid REFERENCES workforce.practitioners(id), red_flags jsonb NOT NULL DEFAULT '[]',
 reassessment_due_at timestamptz, source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.diagnoses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, code_system_uri text NOT NULL,
 code text NOT NULL, display text, diagnosis_type text, rank integer, onset_at timestamptz, recorded_at timestamptz,
 verification_status text, clinical_status text, source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.patient_flags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
 encounter_id uuid REFERENCES clinical.encounters(id) ON DELETE CASCADE, flag_code text NOT NULL, category text NOT NULL,
 severity core.severity_level NOT NULL, description_encrypted bytea, starts_at timestamptz NOT NULL, ends_at timestamptz,
 status core.record_status NOT NULL DEFAULT 'active', source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.isolation_requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, category core.isolation_category NOT NULL,
 custom_category text, organism_code_system text, organism_code text, negative_pressure_required boolean NOT NULL DEFAULT false,
 private_room_required boolean NOT NULL DEFAULT false, cohorting_allowed boolean NOT NULL DEFAULT false,
 ppe_requirements jsonb NOT NULL DEFAULT '[]', starts_at timestamptz NOT NULL, ends_at timestamptz,
 status core.record_status NOT NULL DEFAULT 'active', source_reference text, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((category='custom' AND custom_category IS NOT NULL) OR category<>'custom')
);
CREATE TABLE clinical.care_requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, requirement_type text NOT NULL,
 requirement_code text NOT NULL, quantity numeric(14,4), frequency text, minimum_staff_skill text,
 required_location_capability text, starts_at timestamptz NOT NULL, ends_at timestamptz,
 priority core.severity_level NOT NULL DEFAULT 'medium', source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.queue_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id),
 code citext NOT NULL, name text NOT NULL, queue_type text NOT NULL, service_level_minutes integer CHECK(service_level_minutes>0),
 priority_rules jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,facility_id,code)
);
CREATE TABLE clinical.queue_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 queue_definition_id uuid NOT NULL REFERENCES clinical.queue_definitions(id),
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, entered_at timestamptz NOT NULL,
 exited_at timestamptz, queue_status text NOT NULL, priority_score numeric(12,4), position_hint integer, waiting_reason text,
 assigned_location_id uuid REFERENCES capacity.locations(id), source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX queue_entries_active_idx ON clinical.queue_entries(queue_definition_id,entered_at) WHERE exited_at IS NULL;
CREATE TABLE clinical.patient_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id), encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE,
 from_location_id uuid REFERENCES capacity.locations(id), to_location_id uuid REFERENCES capacity.locations(id),
 from_bed_id uuid REFERENCES capacity.beds(id), to_bed_id uuid REFERENCES capacity.beds(id), movement_type text NOT NULL,
 requested_at timestamptz, started_at timestamptz, completed_at timestamptz, status text NOT NULL,
 isolation_transport_requirements jsonb NOT NULL DEFAULT '[]', source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.discharge_readiness (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id) ON DELETE CASCADE, assessed_at timestamptz NOT NULL,
 medically_ready boolean NOT NULL, expected_discharge_at timestamptz, blockers jsonb NOT NULL DEFAULT '[]', confidence core.probability,
 assessed_by_practitioner_id uuid REFERENCES workforce.practitioners(id), source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.transfer_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id), requested_by_practitioner_id uuid REFERENCES workforce.practitioners(id),
 requested_at timestamptz NOT NULL, urgency text NOT NULL, required_care_level text NOT NULL, specialty_code text,
 reason_encrypted bytea, destination_preference jsonb NOT NULL DEFAULT '{}', status text NOT NULL,
 accepted_destination_id uuid, accepted_at timestamptz, source_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.transfer_destinations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 transfer_request_id uuid NOT NULL REFERENCES clinical.transfer_requests(id) ON DELETE CASCADE,
 destination_facility_id uuid REFERENCES core.facilities(id), external_facility_name text, contacted_at timestamptz,
 response_at timestamptz, response_status text, available_bed_type text, estimated_acceptance_at timestamptz,
 notes_encrypted bytea, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.transport_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 encounter_id uuid REFERENCES clinical.encounters(id), patient_id uuid REFERENCES clinical.patients(id), transport_type text NOT NULL,
 origin_location_id uuid REFERENCES capacity.locations(id), destination_location_id uuid REFERENCES capacity.locations(id),
 external_destination text, priority text NOT NULL, requested_at timestamptz NOT NULL, needed_by timestamptz,
 assigned_resource text, status text NOT NULL, started_at timestamptz, completed_at timestamptz,
 special_requirements jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.patient_cohorts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), name text NOT NULL, cohort_type text NOT NULL, criteria jsonb NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE clinical.patient_cohort_members (
 patient_cohort_id uuid NOT NULL REFERENCES clinical.patient_cohorts(id) ON DELETE CASCADE,
 patient_id uuid NOT NULL REFERENCES clinical.patients(id) ON DELETE CASCADE,
 encounter_id uuid REFERENCES clinical.encounters(id) ON DELETE CASCADE, added_at timestamptz NOT NULL DEFAULT now(),
 removed_at timestamptz, reason text, PRIMARY KEY(patient_cohort_id,patient_id,added_at)
);
ALTER TABLE capacity.bed_assignments ADD FOREIGN KEY(patient_id) REFERENCES clinical.patients(id);
ALTER TABLE capacity.bed_assignments ADD FOREIGN KEY(encounter_id) REFERENCES clinical.encounters(id);
ALTER TABLE capacity.bed_holds ADD FOREIGN KEY(patient_id) REFERENCES clinical.patients(id);
ALTER TABLE capacity.bed_holds ADD FOREIGN KEY(encounter_id) REFERENCES clinical.encounters(id);
ALTER TABLE capacity.device_assignments ADD FOREIGN KEY(patient_id) REFERENCES clinical.patients(id);
ALTER TABLE capacity.device_assignments ADD FOREIGN KEY(encounter_id) REFERENCES clinical.encounters(id);

-- INCIDENT COMMAND / HICS-ALIGNED OPERATIONAL MODEL
CREATE TABLE incident.incident_types (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, category text NOT NULL, default_severity core.severity_level NOT NULL,
 default_playbook jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE incident.incidents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_type_id uuid NOT NULL REFERENCES incident.incident_types(id), incident_number citext NOT NULL, name text NOT NULL,
 status core.incident_status NOT NULL DEFAULT 'monitoring', severity core.severity_level NOT NULL,
 primary_facility_id uuid NOT NULL REFERENCES core.facilities(id), started_at timestamptz NOT NULL, activated_at timestamptz,
 stabilized_at timestamptz, closed_at timestamptz, commander_user_id uuid REFERENCES iam.users(id),
 situation_summary text, objectives_summary text, external_declaration_reference text,
 source_kind core.source_kind NOT NULL DEFAULT 'manual', metadata jsonb NOT NULL DEFAULT '{}', created_by uuid REFERENCES iam.users(id),
 updated_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,incident_number), UNIQUE(tenant_id,id)
);
CREATE TABLE incident.incident_facilities (
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), role text NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(),
 left_at timestamptz, PRIMARY KEY(incident_id,facility_id)
);
CREATE TABLE incident.operational_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE, period_number integer NOT NULL CHECK(period_number>0),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status core.record_status NOT NULL DEFAULT 'active',
 briefing_at timestamptz, planning_deadline_at timestamptz, approved_at timestamptz, approved_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(incident_id,period_number), CHECK(ends_at>starts_at)
);
CREATE TABLE incident.command_position_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, section text NOT NULL,
 reports_to_position_id uuid REFERENCES incident.command_position_definitions(id), responsibilities jsonb NOT NULL DEFAULT '[]',
 qualification_requirements jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE incident.command_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id) ON DELETE CASCADE,
 position_definition_id uuid NOT NULL REFERENCES incident.command_position_definitions(id), user_id uuid REFERENCES iam.users(id),
 practitioner_id uuid REFERENCES workforce.practitioners(id), external_person_name text, starts_at timestamptz NOT NULL,
 ends_at timestamptz, assignment_status text NOT NULL, appointed_by uuid REFERENCES iam.users(id),
 CHECK(num_nonnulls(user_id,practitioner_id,external_person_name)=1)
);
CREATE TABLE incident.situation_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id), report_number integer NOT NULL, as_of timestamptz NOT NULL,
 summary text NOT NULL, impact_summary jsonb NOT NULL DEFAULT '{}', capacity_summary jsonb NOT NULL DEFAULT '{}',
 staffing_summary jsonb NOT NULL DEFAULT '{}', safety_summary jsonb NOT NULL DEFAULT '{}',
 external_conditions jsonb NOT NULL DEFAULT '{}', prepared_by uuid REFERENCES iam.users(id), approved_by uuid REFERENCES iam.users(id),
 approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(incident_id,report_number)
);
CREATE TABLE incident.hazards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id), facility_id uuid REFERENCES core.facilities(id),
 location_id uuid REFERENCES capacity.locations(id), hazard_type text NOT NULL, description text NOT NULL,
 likelihood core.probability, impact_level core.severity_level NOT NULL, risk_score numeric(12,4), identified_at timestamptz NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', owner_user_id uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE incident.safety_measures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 hazard_id uuid NOT NULL REFERENCES incident.hazards(id) ON DELETE CASCADE, measure_type text NOT NULL,
 description text NOT NULL, required_ppe jsonb NOT NULL DEFAULT '[]', assigned_to uuid REFERENCES iam.users(id),
 due_at timestamptz, completed_at timestamptz, effectiveness_status text, evidence jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE incident.objectives (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid NOT NULL REFERENCES incident.operational_periods(id) ON DELETE CASCADE,
 objective_number integer NOT NULL, description text NOT NULL, priority integer NOT NULL DEFAULT 100,
 success_measure jsonb NOT NULL DEFAULT '{}', owner_position_id uuid REFERENCES incident.command_position_definitions(id),
 status core.task_status NOT NULL DEFAULT 'ready', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(operational_period_id,objective_number)
);
CREATE TABLE incident.tactics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 objective_id uuid NOT NULL REFERENCES incident.objectives(id) ON DELETE CASCADE, tactic_number integer NOT NULL,
 description text NOT NULL, assigned_section text, assigned_unit text, resource_requirements jsonb NOT NULL DEFAULT '[]',
 starts_at timestamptz, due_at timestamptz, status core.task_status NOT NULL DEFAULT 'ready',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(objective_id,tactic_number)
);
CREATE TABLE incident.action_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid NOT NULL REFERENCES incident.operational_periods(id) ON DELETE CASCADE,
 title text NOT NULL, status core.approval_status NOT NULL DEFAULT 'pending', situation_summary text, health_safety_briefing text,
 prepared_by uuid REFERENCES iam.users(id), prepared_at timestamptz, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 supersedes_action_plan_id uuid REFERENCES incident.action_plans(id), document_file_id uuid, metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(operational_period_id,title)
);
CREATE TABLE incident.action_plan_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 action_plan_id uuid NOT NULL REFERENCES incident.action_plans(id) ON DELETE CASCADE,
 objective_id uuid REFERENCES incident.objectives(id), tactic_id uuid REFERENCES incident.tactics(id), item_type text NOT NULL,
 item_order integer NOT NULL, content jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(action_plan_id,item_order)
);
CREATE TABLE incident.tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id), objective_id uuid REFERENCES incident.objectives(id),
 tactic_id uuid REFERENCES incident.tactics(id), parent_task_id uuid REFERENCES incident.tasks(id), task_number citext NOT NULL,
 title text NOT NULL, description text, task_type text NOT NULL, status core.task_status NOT NULL DEFAULT 'ready',
 priority core.severity_level NOT NULL DEFAULT 'medium', assigned_user_id uuid REFERENCES iam.users(id),
 assigned_practitioner_id uuid REFERENCES workforce.practitioners(id), assigned_department_id uuid REFERENCES core.departments(id),
 assigned_external_party text, requested_at timestamptz NOT NULL DEFAULT now(), starts_at timestamptz, due_at timestamptz,
 completed_at timestamptz, completion_evidence jsonb NOT NULL DEFAULT '{}', source_reference text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(incident_id,task_number)
);
CREATE TABLE incident.task_dependencies (
 predecessor_task_id uuid NOT NULL REFERENCES incident.tasks(id) ON DELETE CASCADE,
 successor_task_id uuid NOT NULL REFERENCES incident.tasks(id) ON DELETE CASCADE,
 dependency_type text NOT NULL DEFAULT 'finish_to_start', lag_minutes integer NOT NULL DEFAULT 0,
 PRIMARY KEY(predecessor_task_id,successor_task_id), CHECK(predecessor_task_id<>successor_task_id)
);
CREATE TABLE incident.resource_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id), request_number citext NOT NULL,
 requested_by uuid REFERENCES iam.users(id), requested_at timestamptz NOT NULL, resource_type text NOT NULL,
 resource_code text, description text NOT NULL, quantity numeric(16,4) NOT NULL CHECK(quantity>0), unit_of_measure text,
 needed_at timestamptz, delivery_location_id uuid REFERENCES capacity.locations(id), priority core.severity_level NOT NULL,
 status text NOT NULL, justification text, estimated_cost numeric(18,2), currency_code char(3),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(incident_id,request_number)
);
CREATE TABLE incident.resource_fulfillments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 resource_request_id uuid NOT NULL REFERENCES incident.resource_requests(id) ON DELETE CASCADE, fulfillment_source text NOT NULL,
 source_entity_id uuid, quantity numeric(16,4) NOT NULL CHECK(quantity>0), promised_at timestamptz, dispatched_at timestamptz,
 delivered_at timestamptz, status text NOT NULL, tracking_reference text, actual_cost numeric(18,2), currency_code char(3),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE incident.decisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE,
 operational_period_id uuid REFERENCES incident.operational_periods(id), decision_number citext NOT NULL, subject text NOT NULL,
 decision_text text NOT NULL, rationale text NOT NULL, alternatives_considered jsonb NOT NULL DEFAULT '[]',
 risk_summary jsonb NOT NULL DEFAULT '{}', decided_by uuid NOT NULL REFERENCES iam.users(id), decided_at timestamptz NOT NULL,
 effective_at timestamptz, expires_at timestamptz, supersedes_decision_id uuid REFERENCES incident.decisions(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(incident_id,decision_number)
);
CREATE TABLE incident.approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE, subject_type text NOT NULL, subject_id uuid NOT NULL,
 approval_type text NOT NULL, status core.approval_status NOT NULL DEFAULT 'pending', requested_by uuid REFERENCES iam.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(), assigned_approver_user_id uuid REFERENCES iam.users(id),
 assigned_approver_role text, due_at timestamptz, decided_by uuid REFERENCES iam.users(id), decided_at timestamptz,
 decision_reason text, signature_reference text
);
CREATE INDEX incident_approvals_subject_idx ON incident.approvals(subject_type,subject_id);
CREATE TABLE incident.timeline_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id) ON DELETE CASCADE, occurred_at timestamptz NOT NULL,
 event_type text NOT NULL, severity core.severity_level NOT NULL DEFAULT 'info', title text NOT NULL, description text,
 source_kind core.source_kind NOT NULL, source_reference text, actor_id uuid, payload jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX timeline_events_incident_time_idx ON incident.timeline_events(incident_id,occurred_at DESC);

-- POLICY / RULE ENGINE / GATES
CREATE TABLE policy.policy_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 policy_code citext NOT NULL, title text NOT NULL, policy_type text NOT NULL,
 owner_department_id uuid REFERENCES core.departments(id), jurisdiction text, issuing_authority text,
 status core.record_status NOT NULL DEFAULT 'draft', source_uri text, metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,policy_code)
);
CREATE TABLE policy.policy_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 policy_document_id uuid NOT NULL REFERENCES policy.policy_documents(id) ON DELETE CASCADE,
 version_label text NOT NULL, version_number integer NOT NULL, content_hash core.sha256_hex NOT NULL,
 effective_from timestamptz, effective_to timestamptz, status core.record_status NOT NULL DEFAULT 'draft',
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, source_file_id uuid,
 canonical_text text, structured_content jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(policy_document_id,version_number), UNIQUE(policy_document_id,content_hash),
 CHECK(effective_to IS NULL OR effective_from IS NULL OR effective_to>effective_from)
);
CREATE TABLE policy.policy_sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 policy_version_id uuid NOT NULL REFERENCES policy.policy_versions(id) ON DELETE CASCADE,
 parent_section_id uuid REFERENCES policy.policy_sections(id) ON DELETE CASCADE, section_path text NOT NULL,
 heading text, content_text text NOT NULL, content_hash core.sha256_hex NOT NULL, order_index integer NOT NULL,
 citations jsonb NOT NULL DEFAULT '[]', metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(policy_version_id,section_path)
);
CREATE TABLE policy.rule_sets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name citext NOT NULL, description text, domain text NOT NULL,
 engine_type text NOT NULL CHECK(engine_type IN('sql','json_logic','cel','rego','dmn','custom')),
 engine_version text, status core.record_status NOT NULL DEFAULT 'draft', effective_from timestamptz, effective_to timestamptz,
 default_constraint_strength core.constraint_strength NOT NULL DEFAULT 'hard', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1, UNIQUE(tenant_id,name,effective_from)
);
CREATE TABLE policy.policy_rule_set_links (
 policy_version_id uuid NOT NULL REFERENCES policy.policy_versions(id) ON DELETE CASCADE,
 rule_set_id uuid NOT NULL REFERENCES policy.rule_sets(id) ON DELETE CASCADE,
 relationship_type text NOT NULL DEFAULT 'implements', PRIMARY KEY(policy_version_id,rule_set_id)
);
CREATE TABLE policy.rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_set_id uuid NOT NULL REFERENCES policy.rule_sets(id) ON DELETE CASCADE, rule_code citext NOT NULL,
 name text NOT NULL, description text NOT NULL, category text NOT NULL,
 constraint_strength core.constraint_strength NOT NULL, severity core.severity_level NOT NULL,
 expression_language text NOT NULL, condition_expression text NOT NULL, message_template text NOT NULL,
 remediation_template text, evaluation_order integer NOT NULL DEFAULT 100, enabled boolean NOT NULL DEFAULT true,
 fail_closed boolean NOT NULL DEFAULT true, policy_section_id uuid REFERENCES policy.policy_sections(id),
 input_schema jsonb NOT NULL DEFAULT '{}', output_schema jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(rule_set_id,rule_code)
);
CREATE TABLE policy.rule_parameters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE, parameter_key citext NOT NULL, data_type text NOT NULL,
 default_value jsonb, required boolean NOT NULL DEFAULT false, allowed_values jsonb, validation_expression text,
 description text, UNIQUE(rule_id,parameter_key)
);
CREATE TABLE policy.rule_parameter_overrides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_parameter_id uuid NOT NULL REFERENCES policy.rule_parameters(id) ON DELETE CASCADE,
 facility_id uuid REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id),
 incident_type_id uuid REFERENCES incident.incident_types(id), override_value jsonb NOT NULL, reason text NOT NULL,
 valid_from timestamptz NOT NULL, valid_to timestamptz, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 UNIQUE NULLS NOT DISTINCT(rule_parameter_id,facility_id,department_id,incident_type_id,valid_from)
);
CREATE TABLE policy.rule_applicability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE, facility_id uuid REFERENCES core.facilities(id),
 department_id uuid REFERENCES core.departments(id), service_line_id uuid REFERENCES core.service_lines(id),
 incident_type_id uuid REFERENCES incident.incident_types(id), care_level text, applicability_expression text,
 include boolean NOT NULL DEFAULT true, priority integer NOT NULL DEFAULT 100
);
CREATE TABLE policy.rule_dependencies (
 rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE,
 depends_on_rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE, dependency_type text NOT NULL,
 PRIMARY KEY(rule_id,depends_on_rule_id), CHECK(rule_id<>depends_on_rule_id)
);
CREATE TABLE policy.rule_tests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE, test_name text NOT NULL,
 input_fixture jsonb NOT NULL, expected_result jsonb NOT NULL, last_run_at timestamptz, last_outcome text,
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(rule_id,test_name)
);
CREATE TABLE policy.evidence_requirements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_id uuid NOT NULL REFERENCES policy.rules(id) ON DELETE CASCADE, evidence_type text NOT NULL, source_type text NOT NULL,
 freshness_minutes integer CHECK(freshness_minutes>0), minimum_confidence core.probability,
 mandatory boolean NOT NULL DEFAULT true, description text
);
CREATE TABLE policy.policy_acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 policy_version_id uuid NOT NULL REFERENCES policy.policy_versions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE, acknowledged_at timestamptz NOT NULL,
 acknowledgement_type text NOT NULL, signature_reference text, UNIQUE(policy_version_id,user_id,acknowledgement_type)
);
CREATE TABLE policy.override_authorities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 override_type text NOT NULL, minimum_severity core.severity_level NOT NULL, role_id uuid REFERENCES iam.roles(id),
 command_position_id uuid REFERENCES incident.command_position_definitions(id), requires_dual_approval boolean NOT NULL DEFAULT false,
 maximum_duration_minutes integer, required_justification_fields jsonb NOT NULL DEFAULT '[]',
 status core.record_status NOT NULL DEFAULT 'active'
);
CREATE TABLE policy.override_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id), plan_id uuid, rule_id uuid NOT NULL REFERENCES policy.rules(id),
 requested_by uuid NOT NULL REFERENCES iam.users(id), requested_at timestamptz NOT NULL DEFAULT now(), justification text NOT NULL,
 proposed_controls jsonb NOT NULL DEFAULT '[]', requested_duration_minutes integer,
 status core.approval_status NOT NULL DEFAULT 'pending', expires_at timestamptz, decided_by uuid REFERENCES iam.users(id),
 decided_at timestamptz, decision_reason text, second_approver uuid REFERENCES iam.users(id), second_approved_at timestamptz
);
CREATE TABLE policy.evaluation_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id), subject_type text NOT NULL, subject_id uuid NOT NULL,
 rule_set_id uuid NOT NULL REFERENCES policy.rule_sets(id), started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 status core.execution_status NOT NULL DEFAULT 'running', input_snapshot_hash core.sha256_hex, input_snapshot jsonb NOT NULL,
 engine_metadata jsonb NOT NULL DEFAULT '{}', initiated_by uuid, correlation_id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE policy.rule_evaluations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 evaluation_session_id uuid NOT NULL REFERENCES policy.evaluation_sessions(id) ON DELETE CASCADE,
 rule_id uuid NOT NULL REFERENCES policy.rules(id),
 outcome text NOT NULL CHECK(outcome IN('pass','fail','indeterminate','error','not_applicable')),
 evaluated_at timestamptz NOT NULL DEFAULT now(), duration_ms integer CHECK(duration_ms>=0),
 input_facts jsonb NOT NULL DEFAULT '{}', output_facts jsonb NOT NULL DEFAULT '{}', evidence jsonb NOT NULL DEFAULT '[]',
 message text, error_detail text, UNIQUE(evaluation_session_id,rule_id)
);
CREATE TABLE policy.violations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 evaluation_session_id uuid NOT NULL REFERENCES policy.evaluation_sessions(id) ON DELETE CASCADE,
 rule_evaluation_id uuid NOT NULL REFERENCES policy.rule_evaluations(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id), plan_id uuid, violation_code text NOT NULL,
 severity core.severity_level NOT NULL, constraint_strength core.constraint_strength NOT NULL,
 status core.violation_status NOT NULL DEFAULT 'open', summary text NOT NULL, details jsonb NOT NULL,
 affected_entities jsonb NOT NULL DEFAULT '[]', detected_at timestamptz NOT NULL DEFAULT now(),
 acknowledged_by uuid REFERENCES iam.users(id), acknowledged_at timestamptz, resolved_at timestamptz,
 override_request_id uuid REFERENCES policy.override_requests(id)
);
CREATE TABLE policy.remediation_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 violation_id uuid NOT NULL REFERENCES policy.violations(id) ON DELETE CASCADE, action_type text NOT NULL,
 description text NOT NULL, assigned_to_user_id uuid REFERENCES iam.users(id), due_at timestamptz,
 status core.task_status NOT NULL DEFAULT 'ready', completed_at timestamptz, evidence jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);

-- PLANNING / FORECASTING / OPTIMIZATION
CREATE TABLE planning.scenarios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id) ON DELETE CASCADE, facility_id uuid NOT NULL REFERENCES core.facilities(id),
 scenario_code citext NOT NULL, name text NOT NULL, description text, status core.record_status NOT NULL DEFAULT 'draft',
 horizon_starts_at timestamptz NOT NULL, horizon_ends_at timestamptz NOT NULL,
 time_bucket_minutes integer NOT NULL DEFAULT 15 CHECK(time_bucket_minutes>0), created_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,scenario_code), CHECK(horizon_ends_at>horizon_starts_at)
);
CREATE TABLE planning.scenario_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_id uuid NOT NULL REFERENCES planning.scenarios(id) ON DELETE CASCADE, version_number integer NOT NULL,
 status core.record_status NOT NULL DEFAULT 'draft', base_version_id uuid REFERENCES planning.scenario_versions(id),
 change_summary text, input_hash core.sha256_hex, frozen_at timestamptz, frozen_by uuid REFERENCES iam.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scenario_id,version_number)
);
CREATE TABLE planning.baseline_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id) ON DELETE CASCADE, as_of timestamptz NOT NULL,
 source_watermarks jsonb NOT NULL, bed_snapshot jsonb NOT NULL, staffing_snapshot jsonb NOT NULL,
 patient_flow_snapshot jsonb NOT NULL, inventory_snapshot jsonb NOT NULL, external_context_snapshot jsonb NOT NULL DEFAULT '{}',
 snapshot_hash core.sha256_hex NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scenario_version_id,snapshot_hash)
);
CREATE TABLE planning.scenario_inputs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id) ON DELETE CASCADE,
 input_namespace text NOT NULL, input_key text NOT NULL, value jsonb NOT NULL, unit text,
 source_kind core.source_kind NOT NULL, source_reference text, confidence core.probability, valid_from timestamptz,
 valid_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scenario_version_id,input_namespace,input_key,valid_from)
);
CREATE TABLE planning.assumptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id) ON DELETE CASCADE,
 assumption_code citext NOT NULL, description text NOT NULL, value jsonb NOT NULL, rationale text,
 confidence core.probability, sensitivity_range jsonb, approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scenario_version_id,assumption_code)
);
CREATE TABLE planning.demand_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 facility_id uuid NOT NULL REFERENCES core.facilities(id), department_id uuid REFERENCES core.departments(id),
 service_line_id uuid REFERENCES core.service_lines(id), cohort_id uuid REFERENCES clinical.patient_cohorts(id),
 metric_code text NOT NULL, bucket_start timestamptz NOT NULL, bucket_end timestamptz NOT NULL,
 observed_value numeric(18,6) NOT NULL, unit text NOT NULL, source_kind core.source_kind NOT NULL,
 source_reference text, quality_score core.probability, created_at timestamptz NOT NULL DEFAULT now(), CHECK(bucket_end>bucket_start)
);
CREATE INDEX demand_observations_series_idx ON planning.demand_observations(facility_id,metric_code,bucket_start DESC);
CREATE TABLE planning.forecast_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, model_type text NOT NULL, model_version text NOT NULL, artifact_reference text,
 feature_schema jsonb NOT NULL, output_schema jsonb NOT NULL, training_data_window jsonb,
 validation_metrics jsonb NOT NULL DEFAULT '{}', approved_for_clinical_ops boolean NOT NULL DEFAULT false,
 status core.record_status NOT NULL DEFAULT 'draft', approved_by uuid REFERENCES iam.users(id), approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name,model_version)
);
CREATE TABLE planning.demand_forecasts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id) ON DELETE CASCADE,
 forecast_model_id uuid REFERENCES planning.forecast_models(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 department_id uuid REFERENCES core.departments(id), cohort_id uuid REFERENCES clinical.patient_cohorts(id),
 metric_code text NOT NULL, generated_at timestamptz NOT NULL, horizon_starts_at timestamptz NOT NULL,
 horizon_ends_at timestamptz NOT NULL, confidence_level core.probability, model_input_hash core.sha256_hex,
 status core.execution_status NOT NULL DEFAULT 'succeeded', metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE planning.demand_forecast_points (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 demand_forecast_id uuid NOT NULL REFERENCES planning.demand_forecasts(id) ON DELETE CASCADE,
 bucket_start timestamptz NOT NULL, bucket_end timestamptz NOT NULL, point_value numeric(18,6) NOT NULL,
 lower_bound numeric(18,6), upper_bound numeric(18,6), quantiles jsonb NOT NULL DEFAULT '{}', CHECK(bucket_end>bucket_start)
);
CREATE INDEX demand_forecast_points_idx ON planning.demand_forecast_points(demand_forecast_id,bucket_start);
CREATE TABLE planning.optimization_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, model_type text NOT NULL, model_version text NOT NULL, formulation_reference text,
 input_schema jsonb NOT NULL, output_schema jsonb NOT NULL, objective_catalog jsonb NOT NULL,
 constraint_catalog jsonb NOT NULL, validation_suite_reference text, status core.record_status NOT NULL DEFAULT 'draft',
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,name,model_version)
);
CREATE TABLE planning.solver_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name citext NOT NULL, solver_name text NOT NULL, solver_version text NOT NULL, parameters jsonb NOT NULL DEFAULT '{}',
 time_limit_seconds integer CHECK(time_limit_seconds>0), optimality_gap core.probability,
 deterministic boolean NOT NULL DEFAULT true, random_seed bigint, status core.record_status NOT NULL DEFAULT 'active',
 UNIQUE(tenant_id,name)
);
CREATE TABLE planning.objective_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, direction text NOT NULL CHECK(direction IN('minimize','maximize','target')),
 unit text, description text NOT NULL, calculation_expression text, default_weight numeric(18,8) NOT NULL DEFAULT 1,
 status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE planning.constraint_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 code citext NOT NULL, name text NOT NULL, category text NOT NULL, default_strength core.constraint_strength NOT NULL,
 default_severity core.severity_level NOT NULL, description text NOT NULL, expression_template text, unit text,
 source_policy_rule_id uuid REFERENCES policy.rules(id), status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,code)
);
CREATE TABLE planning.optimization_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id),
 optimization_model_id uuid NOT NULL REFERENCES planning.optimization_models(id),
 solver_profile_id uuid NOT NULL REFERENCES planning.solver_profiles(id), incident_id uuid REFERENCES incident.incidents(id),
 run_number integer NOT NULL, status core.execution_status NOT NULL DEFAULT 'queued', requested_by uuid REFERENCES iam.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz,
 input_hash core.sha256_hex, model_hash core.sha256_hex, solver_status text, objective_value numeric(24,8),
 optimality_gap core.probability, elapsed_ms bigint, error_code text, error_detail text,
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid(), trace_id text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scenario_version_id,run_number)
);
CREATE TABLE planning.run_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 optimization_run_id uuid NOT NULL REFERENCES planning.optimization_runs(id) ON DELETE CASCADE,
 step_number integer NOT NULL, step_name text NOT NULL, status core.execution_status NOT NULL,
 started_at timestamptz, completed_at timestamptz, input_summary jsonb NOT NULL DEFAULT '{}',
 output_summary jsonb NOT NULL DEFAULT '{}', log_reference text, error_detail text, UNIQUE(optimization_run_id,step_number)
);
CREATE TABLE planning.run_objectives (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 optimization_run_id uuid NOT NULL REFERENCES planning.optimization_runs(id) ON DELETE CASCADE,
 objective_definition_id uuid NOT NULL REFERENCES planning.objective_definitions(id), weight numeric(18,8) NOT NULL,
 target_value numeric(24,8), achieved_value numeric(24,8), normalized_value numeric(24,8), contribution numeric(24,8),
 UNIQUE(optimization_run_id,objective_definition_id)
);
CREATE TABLE planning.run_constraints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 optimization_run_id uuid NOT NULL REFERENCES planning.optimization_runs(id) ON DELETE CASCADE,
 constraint_definition_id uuid NOT NULL REFERENCES planning.constraint_definitions(id), strength core.constraint_strength NOT NULL,
 threshold_value numeric(24,8), actual_value numeric(24,8), slack_value numeric(24,8), satisfied boolean,
 details jsonb NOT NULL DEFAULT '{}', UNIQUE(optimization_run_id,constraint_definition_id)
);
CREATE TABLE planning.candidate_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 optimization_run_id uuid NOT NULL REFERENCES planning.optimization_runs(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id), scenario_version_id uuid NOT NULL REFERENCES planning.scenario_versions(id),
 plan_number integer NOT NULL, name text NOT NULL, status core.plan_status NOT NULL DEFAULT 'draft', rank integer,
 generated_at timestamptz NOT NULL DEFAULT now(), horizon_starts_at timestamptz NOT NULL, horizon_ends_at timestamptz NOT NULL,
 summary jsonb NOT NULL DEFAULT '{}', input_hash core.sha256_hex, plan_hash core.sha256_hex,
 supersedes_plan_id uuid REFERENCES planning.candidate_plans(id), created_by uuid, updated_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(optimization_run_id,plan_number), UNIQUE(tenant_id,id)
);
ALTER TABLE policy.override_requests ADD FOREIGN KEY(plan_id) REFERENCES planning.candidate_plans(id);
ALTER TABLE policy.violations ADD FOREIGN KEY(plan_id) REFERENCES planning.candidate_plans(id);
CREATE TABLE planning.plan_scores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE, score_type text NOT NULL,
 score_value numeric(24,8) NOT NULL, unit text, lower_is_better boolean, explanation jsonb NOT NULL DEFAULT '{}',
 calculated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(candidate_plan_id,score_type)
);
CREATE TABLE planning.plan_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE, action_number integer NOT NULL,
 action_type text NOT NULL, title text NOT NULL, description text, starts_at timestamptz, ends_at timestamptz,
 priority core.severity_level NOT NULL DEFAULT 'medium', target_entity_type text, target_entity_id uuid,
 parameters jsonb NOT NULL DEFAULT '{}', prerequisite_action_ids uuid[] NOT NULL DEFAULT '{}', responsible_role text,
 reversible boolean NOT NULL DEFAULT true, rollback_instructions jsonb NOT NULL DEFAULT '{}',
 status core.task_status NOT NULL DEFAULT 'draft', UNIQUE(candidate_plan_id,action_number)
);
CREATE TABLE planning.plan_staffing_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 practitioner_id uuid REFERENCES workforce.practitioners(id), staffing_pool_id uuid REFERENCES workforce.staffing_pools(id),
 role_definition_id uuid NOT NULL REFERENCES workforce.role_definitions(id), facility_id uuid NOT NULL REFERENCES core.facilities(id),
 department_id uuid REFERENCES core.departments(id), location_id uuid REFERENCES capacity.locations(id),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, assignment_type text NOT NULL, planned_fte numeric(6,4),
 overtime_minutes integer NOT NULL DEFAULT 0, qualification_check_status text NOT NULL, fatigue_check_status text NOT NULL,
 policy_evaluation_id uuid REFERENCES policy.rule_evaluations(id), CHECK(num_nonnulls(practitioner_id,staffing_pool_id)=1),
 CHECK(ends_at>starts_at)
);
CREATE TABLE planning.plan_bed_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 bed_id uuid REFERENCES capacity.beds(id), surge_space_id uuid REFERENCES capacity.surge_spaces(id),
 patient_id uuid REFERENCES clinical.patients(id), encounter_id uuid REFERENCES clinical.encounters(id),
 cohort_id uuid REFERENCES clinical.patient_cohorts(id), starts_at timestamptz NOT NULL, ends_at timestamptz,
 allocation_type text NOT NULL, care_level text, isolation_check_status text NOT NULL,
 capability_check_status text NOT NULL, policy_evaluation_id uuid REFERENCES policy.rule_evaluations(id),
 CHECK(num_nonnulls(bed_id,surge_space_id)=1), CHECK(num_nonnulls(patient_id,cohort_id)>=1)
);
CREATE TABLE planning.plan_cohort_routes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 cohort_id uuid NOT NULL REFERENCES clinical.patient_cohorts(id), from_location_id uuid REFERENCES capacity.locations(id),
 to_location_id uuid REFERENCES capacity.locations(id), route_type text NOT NULL, starts_at timestamptz NOT NULL,
 expected_volume numeric(14,4) NOT NULL, travel_minutes integer, queue_impact jsonb NOT NULL DEFAULT '{}',
 policy_evaluation_id uuid REFERENCES policy.rule_evaluations(id)
);
CREATE TABLE planning.plan_device_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 device_id uuid REFERENCES capacity.devices(id), device_type_id uuid REFERENCES capacity.device_types(id),
 quantity integer NOT NULL DEFAULT 1 CHECK(quantity>0), target_location_id uuid REFERENCES capacity.locations(id),
 patient_id uuid REFERENCES clinical.patients(id), starts_at timestamptz NOT NULL, ends_at timestamptz,
 readiness_check_status text NOT NULL, CHECK(num_nonnulls(device_id,device_type_id)=1)
);
CREATE TABLE planning.plan_supply_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 inventory_item_id uuid NOT NULL REFERENCES capacity.inventory_items(id), source_location_id uuid REFERENCES capacity.locations(id),
 target_location_id uuid REFERENCES capacity.locations(id), quantity numeric(16,4) NOT NULL CHECK(quantity>0),
 unit_of_measure text NOT NULL, needed_at timestamptz NOT NULL, stock_check_status text NOT NULL,
 substitution_used boolean NOT NULL DEFAULT false, substitution_details jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE planning.plan_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 encounter_id uuid NOT NULL REFERENCES clinical.encounters(id), destination_facility_id uuid REFERENCES core.facilities(id),
 external_destination text, transfer_priority text NOT NULL, proposed_departure_at timestamptz,
 estimated_arrival_at timestamptz, transport_type text, acceptance_status text,
 policy_evaluation_id uuid REFERENCES policy.rule_evaluations(id)
);
CREATE TABLE planning.plan_wait_projections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 queue_definition_id uuid NOT NULL REFERENCES clinical.queue_definitions(id), bucket_start timestamptz NOT NULL,
 bucket_end timestamptz NOT NULL, arrivals numeric(14,4) NOT NULL, completions numeric(14,4) NOT NULL,
 queue_length numeric(14,4) NOT NULL, median_wait_minutes numeric(14,4), p90_wait_minutes numeric(14,4),
 left_without_being_seen numeric(14,4), CHECK(bucket_end>bucket_start)
);
CREATE TABLE planning.plan_safety_metrics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 metric_code text NOT NULL, metric_value numeric(24,8), unit text, threshold_value numeric(24,8),
 threshold_direction text, compliant boolean, severity core.severity_level, evidence jsonb NOT NULL DEFAULT '{}',
 UNIQUE(candidate_plan_id,metric_code)
);
CREATE TABLE planning.plan_comparisons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 left_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 right_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE, comparison_type text NOT NULL,
 differences jsonb NOT NULL, preferred_plan_id uuid REFERENCES planning.candidate_plans(id), rationale text,
 created_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK(left_plan_id<>right_plan_id)
);
CREATE TABLE planning.simulations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE, simulation_type text NOT NULL,
 configuration jsonb NOT NULL, requested_replications integer NOT NULL CHECK(requested_replications>0), random_seed bigint,
 status core.execution_status NOT NULL DEFAULT 'queued', started_at timestamptz, completed_at timestamptz,
 summary_metrics jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE planning.simulation_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 simulation_id uuid NOT NULL REFERENCES planning.simulations(id) ON DELETE CASCADE, replication_number integer NOT NULL,
 random_seed bigint, status core.execution_status NOT NULL, outcome_metrics jsonb NOT NULL DEFAULT '{}',
 violations jsonb NOT NULL DEFAULT '[]', duration_ms bigint, error_detail text, UNIQUE(simulation_id,replication_number)
);
CREATE TABLE planning.sensitivity_analyses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE, parameter_key text NOT NULL,
 tested_values jsonb NOT NULL, outcome_series jsonb NOT NULL, tipping_point jsonb, interpretation text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE planning.approval_workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, plan_risk_level core.severity_level NOT NULL, applicability jsonb NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name)
);
CREATE TABLE planning.approval_workflow_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 approval_workflow_id uuid NOT NULL REFERENCES planning.approval_workflows(id) ON DELETE CASCADE,
 step_number integer NOT NULL, step_name text NOT NULL, approver_role_id uuid REFERENCES iam.roles(id),
 command_position_id uuid REFERENCES incident.command_position_definitions(id), minimum_approvals integer NOT NULL DEFAULT 1,
 parallel_group integer, due_minutes integer, required_conditions jsonb NOT NULL DEFAULT '{}',
 UNIQUE(approval_workflow_id,step_number), CHECK(minimum_approvals>0)
);
CREATE TABLE planning.plan_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id) ON DELETE CASCADE,
 workflow_step_id uuid NOT NULL REFERENCES planning.approval_workflow_steps(id), status core.approval_status NOT NULL DEFAULT 'pending',
 assigned_to_user_id uuid REFERENCES iam.users(id), requested_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz,
 decided_at timestamptz, decided_by uuid REFERENCES iam.users(id), decision_reason text, signature_reference text,
 UNIQUE(candidate_plan_id,workflow_step_id,assigned_to_user_id)
);
CREATE TABLE planning.plan_executions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 candidate_plan_id uuid NOT NULL REFERENCES planning.candidate_plans(id), incident_id uuid NOT NULL REFERENCES incident.incidents(id),
 status core.execution_status NOT NULL DEFAULT 'queued', authorized_by uuid NOT NULL REFERENCES iam.users(id),
 authorized_at timestamptz NOT NULL, started_at timestamptz, completed_at timestamptz,
 execution_mode text NOT NULL CHECK(execution_mode IN('manual','assisted','automated')),
 rollback_plan jsonb NOT NULL DEFAULT '{}', correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE planning.execution_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 plan_execution_id uuid NOT NULL REFERENCES planning.plan_executions(id) ON DELETE CASCADE,
 plan_action_id uuid NOT NULL REFERENCES planning.plan_actions(id), status core.execution_status NOT NULL DEFAULT 'queued',
 assigned_to_user_id uuid REFERENCES iam.users(id), started_at timestamptz, completed_at timestamptz,
 result jsonb NOT NULL DEFAULT '{}', error_detail text, rollback_status text, UNIQUE(plan_execution_id,plan_action_id)
);
CREATE TABLE planning.execution_deviations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 plan_execution_id uuid NOT NULL REFERENCES planning.plan_executions(id) ON DELETE CASCADE,
 execution_step_id uuid REFERENCES planning.execution_steps(id), detected_at timestamptz NOT NULL,
 deviation_type text NOT NULL, severity core.severity_level NOT NULL, description text NOT NULL,
 expected_value jsonb, actual_value jsonb, corrective_action text, accepted_by uuid REFERENCES iam.users(id),
 accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE planning.after_action_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid NOT NULL REFERENCES incident.incidents(id), plan_execution_id uuid REFERENCES planning.plan_executions(id),
 conducted_at timestamptz, facilitated_by uuid REFERENCES iam.users(id), what_worked jsonb NOT NULL DEFAULT '[]',
 what_failed jsonb NOT NULL DEFAULT '[]', safety_events jsonb NOT NULL DEFAULT '[]', policy_gaps jsonb NOT NULL DEFAULT '[]',
 recommendations jsonb NOT NULL DEFAULT '[]', status core.record_status NOT NULL DEFAULT 'draft',
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- INTEGRATION / FHIR / HL7 / EVENTING
CREATE TABLE integration.source_systems (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name citext NOT NULL, system_type text NOT NULL, vendor text, product text,
 environment text NOT NULL CHECK(environment IN('development','test','staging','production','disaster_recovery')),
 status core.record_status NOT NULL DEFAULT 'active', authoritative_domains text[] NOT NULL DEFAULT '{}',
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name,environment)
);
CREATE TABLE integration.endpoints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid NOT NULL REFERENCES integration.source_systems(id) ON DELETE CASCADE, endpoint_type text NOT NULL,
 base_uri text NOT NULL, auth_type text, credential_reference text, tls_profile jsonb NOT NULL DEFAULT '{}',
 timeout_ms integer NOT NULL DEFAULT 30000 CHECK(timeout_ms>0), retry_policy jsonb NOT NULL DEFAULT '{}',
 rate_limit_policy jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_system_id,endpoint_type,base_uri)
);
CREATE TABLE integration.connection_tests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 endpoint_id uuid NOT NULL REFERENCES integration.endpoints(id) ON DELETE CASCADE, tested_at timestamptz NOT NULL,
 outcome text NOT NULL, latency_ms integer, response_summary jsonb NOT NULL DEFAULT '{}', error_detail text
);
CREATE TABLE integration.fhir_resources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid NOT NULL REFERENCES integration.source_systems(id), fhir_version text NOT NULL,
 resource_type text NOT NULL, logical_id text NOT NULL, version_id text, last_updated timestamptz,
 resource_json jsonb NOT NULL, resource_hash core.sha256_hex NOT NULL, deleted boolean NOT NULL DEFAULT false,
 received_at timestamptz NOT NULL DEFAULT now(), processing_status text NOT NULL DEFAULT 'received', error_detail text,
 UNIQUE(source_system_id,resource_type,logical_id,version_id)
);
CREATE INDEX fhir_resources_type_updated_idx ON integration.fhir_resources(source_system_id,resource_type,last_updated DESC);
CREATE INDEX fhir_resources_json_gin_idx ON integration.fhir_resources USING gin(resource_json jsonb_path_ops);
CREATE TABLE integration.fhir_resource_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 fhir_resource_id uuid NOT NULL REFERENCES integration.fhir_resources(id) ON DELETE CASCADE,
 canonical_entity_type text NOT NULL, canonical_entity_id uuid NOT NULL, relationship_type text NOT NULL DEFAULT 'projects_to',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(fhir_resource_id,canonical_entity_type,canonical_entity_id)
);
CREATE TABLE integration.fhir_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid NOT NULL REFERENCES integration.source_systems(id), external_subscription_id text, topic_uri text,
 criteria text, channel_type text NOT NULL, endpoint_uri text, payload_content_type text, heartbeat_seconds integer,
 timeout_seconds integer, status text NOT NULL, expires_at timestamptz, last_notification_at timestamptz,
 error_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE integration.hl7_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid NOT NULL REFERENCES integration.source_systems(id), direction core.direction NOT NULL,
 message_type text, trigger_event text, control_id text, message_timestamp timestamptz, raw_message_encrypted bytea NOT NULL,
 message_hash core.sha256_hex NOT NULL, received_or_sent_at timestamptz NOT NULL DEFAULT now(),
 processing_status text NOT NULL DEFAULT 'received', parsed_payload jsonb, error_detail text,
 UNIQUE(source_system_id,direction,control_id)
);
CREATE TABLE integration.hl7_acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 hl7_message_id uuid NOT NULL REFERENCES integration.hl7_messages(id) ON DELETE CASCADE,
 acknowledgement_code text NOT NULL, acknowledgement_text text, raw_ack_encrypted bytea,
 sent_or_received_at timestamptz NOT NULL
);
CREATE TABLE integration.mapping_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, source_system_id uuid REFERENCES integration.source_systems(id), source_resource_type text NOT NULL,
 target_entity_type text NOT NULL, version text NOT NULL, status core.record_status NOT NULL DEFAULT 'active',
 mapping_definition jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name,version)
);
CREATE TABLE integration.field_mappings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 mapping_profile_id uuid NOT NULL REFERENCES integration.mapping_profiles(id) ON DELETE CASCADE,
 source_path text NOT NULL, target_path text NOT NULL, transform_expression text, required boolean NOT NULL DEFAULT false,
 default_value jsonb, terminology_map_id uuid REFERENCES terminology.concept_maps(id), order_index integer NOT NULL,
 UNIQUE(mapping_profile_id,source_path,target_path)
);
CREATE TABLE integration.files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 storage_provider text NOT NULL, storage_key text NOT NULL, file_name text NOT NULL, content_type text NOT NULL,
 size_bytes bigint NOT NULL CHECK(size_bytes>=0), sha256 core.sha256_hex NOT NULL,
 classification core.data_classification NOT NULL, contains_phi boolean NOT NULL DEFAULT false,
 encryption_key_reference text, uploaded_by uuid REFERENCES iam.users(id), uploaded_at timestamptz NOT NULL DEFAULT now(),
 deleted_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(tenant_id,storage_provider,storage_key)
);
ALTER TABLE workforce.certifications ADD FOREIGN KEY(evidence_file_id) REFERENCES integration.files(id);
ALTER TABLE incident.action_plans ADD FOREIGN KEY(document_file_id) REFERENCES integration.files(id);
ALTER TABLE policy.policy_versions ADD FOREIGN KEY(source_file_id) REFERENCES integration.files(id);
CREATE TABLE integration.import_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid REFERENCES integration.source_systems(id), job_type text NOT NULL,
 source_file_id uuid REFERENCES integration.files(id), mapping_profile_id uuid REFERENCES integration.mapping_profiles(id),
 status core.execution_status NOT NULL DEFAULT 'queued', requested_by uuid REFERENCES iam.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz,
 total_records bigint, succeeded_records bigint, failed_records bigint, skipped_records bigint,
 checkpoint jsonb NOT NULL DEFAULT '{}', error_summary text, correlation_id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE integration.import_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 import_job_id uuid NOT NULL REFERENCES integration.import_jobs(id) ON DELETE CASCADE, record_number bigint NOT NULL,
 source_identifier text, status text NOT NULL, canonical_entity_type text, canonical_entity_id uuid,
 validation_errors jsonb NOT NULL DEFAULT '[]', source_payload jsonb, processed_at timestamptz,
 UNIQUE(import_job_id,record_number)
);
CREATE TABLE integration.sync_checkpoints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid NOT NULL REFERENCES integration.source_systems(id), sync_domain text NOT NULL,
 cursor_value text, watermark_time timestamptz, last_success_at timestamptz, last_attempt_at timestamptz,
 last_status text, error_detail text, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_system_id,sync_domain)
);
CREATE TABLE integration.external_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_system_id uuid REFERENCES integration.source_systems(id), event_type text NOT NULL, event_id text,
 occurred_at timestamptz, received_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL,
 payload_hash core.sha256_hex NOT NULL, processing_status text NOT NULL DEFAULT 'received', processed_at timestamptz,
 correlation_id text, causation_id text, UNIQUE NULLS NOT DISTINCT(source_system_id,event_id)
);
CREATE TABLE integration.webhooks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, direction core.direction NOT NULL, endpoint_uri text, secret_reference text,
 event_types text[] NOT NULL DEFAULT '{}', signature_algorithm text NOT NULL DEFAULT 'HMAC-SHA256',
 status core.record_status NOT NULL DEFAULT 'active', retry_policy jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name)
);
CREATE TABLE integration.webhook_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 webhook_id uuid NOT NULL REFERENCES integration.webhooks(id) ON DELETE CASCADE,
 event_id uuid REFERENCES integration.external_events(id), attempt_number integer NOT NULL,
 requested_at timestamptz NOT NULL, completed_at timestamptz, response_status integer, response_headers jsonb,
 response_body_redacted text, outcome text NOT NULL, next_retry_at timestamptz, error_detail text,
 UNIQUE(webhook_id,event_id,attempt_number)
);
CREATE TABLE integration.outbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 aggregate_type text NOT NULL, aggregate_id uuid NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL,
 headers jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz, publish_attempts integer NOT NULL DEFAULT 0, last_error text, correlation_id uuid, causation_id uuid
);
CREATE INDEX outbox_unpublished_idx ON integration.outbox_events(available_at) WHERE published_at IS NULL;
CREATE TABLE integration.inbox_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_name text NOT NULL, external_event_id text NOT NULL, event_type text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, status text NOT NULL DEFAULT 'received',
 payload_hash core.sha256_hex NOT NULL, error_detail text, UNIQUE(tenant_id,source_name,external_event_id)
);
CREATE TABLE integration.dead_letters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE CASCADE,
 source_type text NOT NULL, source_id uuid, event_type text, payload_redacted jsonb, failure_reason text NOT NULL,
 first_failed_at timestamptz NOT NULL, last_failed_at timestamptz NOT NULL, attempts integer NOT NULL,
 status text NOT NULL DEFAULT 'open', resolved_at timestamptz, resolved_by uuid REFERENCES iam.users(id)
);
CREATE TABLE integration.idempotency_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 scope text NOT NULL, idempotency_key text NOT NULL, request_hash core.sha256_hex NOT NULL, response_status integer,
 response_body jsonb, resource_type text, resource_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, UNIQUE(tenant_id,scope,idempotency_key)
);

-- MCP SERVER REGISTRY / REQUEST LEDGER
CREATE TABLE mcp.servers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_key citext NOT NULL, name text NOT NULL, description text, canonical_resource_uri text NOT NULL,
 protocol_version text NOT NULL, transport_type text NOT NULL CHECK(transport_type IN('streamable_http','stdio','custom')),
 status core.record_status NOT NULL DEFAULT 'active', auth_required boolean NOT NULL DEFAULT true,
 authorization_servers text[] NOT NULL DEFAULT '{}', protected_resource_metadata jsonb NOT NULL DEFAULT '{}',
 instructions text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,server_key), UNIQUE(tenant_id,canonical_resource_uri)
);
CREATE TABLE mcp.server_deployments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, environment text NOT NULL,
 deployment_version text NOT NULL, endpoint_uri text, region text, status text NOT NULL, deployed_at timestamptz,
 commit_sha text, image_digest text, configuration_hash core.sha256_hex, healthcheck_uri text, last_healthy_at timestamptz,
 UNIQUE(server_id,environment,deployment_version)
);
CREATE TABLE mcp.server_capabilities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, capability_name text NOT NULL,
 capability_config jsonb NOT NULL DEFAULT '{}', enabled boolean NOT NULL DEFAULT true, UNIQUE(server_id,capability_name)
);
CREATE TABLE mcp.clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 oauth_client_id uuid REFERENCES iam.oauth_clients(id), client_key citext NOT NULL, client_name text NOT NULL,
 client_version text, protocol_versions text[] NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,client_key)
);
CREATE TABLE mcp.client_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id), client_id uuid NOT NULL REFERENCES mcp.clients(id),
 iam_session_id uuid REFERENCES iam.sessions(id), negotiated_protocol_version text NOT NULL,
 client_capabilities jsonb NOT NULL, server_capabilities jsonb NOT NULL, initialized_at timestamptz NOT NULL,
 last_activity_at timestamptz NOT NULL, closed_at timestamptz, close_reason text, session_transport_id text,
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE INDEX mcp_sessions_active_idx ON mcp.client_sessions(server_id,last_activity_at DESC) WHERE closed_at IS NULL;
CREATE TABLE mcp.tool_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, tool_name text NOT NULL, title text,
 description text NOT NULL, annotations jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 requires_human_approval boolean NOT NULL DEFAULT false, risk_level core.severity_level NOT NULL DEFAULT 'low',
 idempotent boolean NOT NULL DEFAULT false, read_only boolean NOT NULL DEFAULT false,
 destructive boolean NOT NULL DEFAULT false, open_world boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), row_version bigint NOT NULL DEFAULT 1,
 UNIQUE(server_id,tool_name)
);
CREATE TABLE mcp.tool_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 tool_definition_id uuid NOT NULL REFERENCES mcp.tool_definitions(id) ON DELETE CASCADE, semantic_version text NOT NULL,
 input_schema jsonb NOT NULL, output_schema jsonb, handler_reference text NOT NULL,
 timeout_ms integer NOT NULL DEFAULT 30000 CHECK(timeout_ms>0), status core.record_status NOT NULL DEFAULT 'active',
 changelog text, content_hash core.sha256_hex NOT NULL, effective_from timestamptz NOT NULL DEFAULT now(),
 effective_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tool_definition_id,semantic_version)
);
CREATE TABLE mcp.tool_permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 tool_definition_id uuid NOT NULL REFERENCES mcp.tool_definitions(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES iam.permissions(id), scope_expression jsonb NOT NULL DEFAULT '{}',
 required boolean NOT NULL DEFAULT true, UNIQUE(tool_definition_id,permission_id)
);
CREATE TABLE mcp.resource_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, uri text NOT NULL, name text NOT NULL,
 title text, description text, mime_type text, size_hint bigint, handler_reference text NOT NULL,
 classification core.data_classification NOT NULL DEFAULT 'internal', contains_phi boolean NOT NULL DEFAULT false,
 subscribable boolean NOT NULL DEFAULT false, status core.record_status NOT NULL DEFAULT 'active',
 metadata jsonb NOT NULL DEFAULT '{}', UNIQUE(server_id,uri)
);
CREATE TABLE mcp.resource_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, uri_template text NOT NULL,
 name text NOT NULL, title text, description text, mime_type text, handler_reference text NOT NULL,
 input_schema jsonb NOT NULL DEFAULT '{}', classification core.data_classification NOT NULL DEFAULT 'internal',
 contains_phi boolean NOT NULL DEFAULT false, status core.record_status NOT NULL DEFAULT 'active', UNIQUE(server_id,uri_template)
);
CREATE TABLE mcp.prompt_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid NOT NULL REFERENCES mcp.servers(id) ON DELETE CASCADE, prompt_name text NOT NULL,
 title text, description text, status core.record_status NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(server_id,prompt_name)
);
CREATE TABLE mcp.prompt_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 prompt_definition_id uuid NOT NULL REFERENCES mcp.prompt_definitions(id) ON DELETE CASCADE,
 semantic_version text NOT NULL, arguments_schema jsonb NOT NULL DEFAULT '{}', messages_template jsonb NOT NULL,
 content_hash core.sha256_hex NOT NULL, status core.record_status NOT NULL DEFAULT 'active',
 effective_from timestamptz NOT NULL DEFAULT now(), effective_to timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(prompt_definition_id,semantic_version)
);
CREATE TABLE mcp.resource_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 client_session_id uuid NOT NULL REFERENCES mcp.client_sessions(id) ON DELETE CASCADE, resource_uri text NOT NULL,
 subscribed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, last_notification_at timestamptz,
 status text NOT NULL DEFAULT 'active', UNIQUE(client_session_id,resource_uri)
);
CREATE TABLE mcp.requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 client_session_id uuid REFERENCES mcp.client_sessions(id) ON DELETE SET NULL, jsonrpc_request_id text,
 method text NOT NULL, primitive text, principal_kind core.actor_kind NOT NULL, principal_id uuid,
 requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 status core.execution_status NOT NULL DEFAULT 'running', request_params_redacted jsonb NOT NULL DEFAULT '{}',
 response_result_redacted jsonb, error_code integer, error_message text, duration_ms bigint,
 cancellation_requested_at timestamptz, correlation_id uuid NOT NULL DEFAULT gen_random_uuid(), trace_id text,
 purpose_of_use text, break_glass_session_id uuid REFERENCES iam.break_glass_sessions(id)
);
CREATE INDEX mcp_requests_time_idx ON mcp.requests(tenant_id,requested_at DESC);
CREATE INDEX mcp_requests_method_idx ON mcp.requests(tenant_id,method,requested_at DESC);
CREATE TABLE mcp.tool_calls (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES mcp.requests(id) ON DELETE CASCADE,
 tool_version_id uuid NOT NULL REFERENCES mcp.tool_versions(id), input_redacted jsonb NOT NULL,
 input_hash core.sha256_hex NOT NULL, status core.execution_status NOT NULL DEFAULT 'running',
 started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, output_redacted jsonb,
 output_hash core.sha256_hex, is_error boolean NOT NULL DEFAULT false, error_type text, error_detail text,
 retry_of_tool_call_id uuid REFERENCES mcp.tool_calls(id), idempotency_key text, approval_id uuid,
 policy_evaluation_session_id uuid REFERENCES policy.evaluation_sessions(id)
);
CREATE TABLE mcp.tool_call_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 tool_call_id uuid NOT NULL REFERENCES mcp.tool_calls(id) ON DELETE CASCADE, step_number integer NOT NULL,
 step_name text NOT NULL, status core.execution_status NOT NULL, started_at timestamptz, completed_at timestamptz,
 input_summary jsonb NOT NULL DEFAULT '{}', output_summary jsonb NOT NULL DEFAULT '{}', error_detail text,
 UNIQUE(tool_call_id,step_number)
);
CREATE TABLE mcp.task_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid REFERENCES mcp.requests(id) ON DELETE SET NULL, tool_call_id uuid REFERENCES mcp.tool_calls(id) ON DELETE SET NULL,
 protocol_task_id text NOT NULL, task_type text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 last_updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, poll_interval_ms integer,
 progress numeric(7,4), result_redacted jsonb, error_detail text, metadata jsonb NOT NULL DEFAULT '{}',
 UNIQUE(tenant_id,protocol_task_id)
);
CREATE TABLE mcp.elicitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES mcp.requests(id) ON DELETE CASCADE, elicitation_id text NOT NULL,
 elicitation_mode text NOT NULL, message text NOT NULL, requested_schema jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending', requested_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
 UNIQUE(request_id,elicitation_id)
);
CREATE TABLE mcp.elicitation_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 elicitation_id uuid NOT NULL REFERENCES mcp.elicitations(id) ON DELETE CASCADE, action text NOT NULL,
 content_redacted jsonb, responded_at timestamptz NOT NULL, responded_by uuid,
 validation_errors jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE mcp.human_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid REFERENCES mcp.requests(id) ON DELETE CASCADE, tool_call_id uuid REFERENCES mcp.tool_calls(id) ON DELETE CASCADE,
 approval_type text NOT NULL, risk_summary jsonb NOT NULL, requested_action jsonb NOT NULL,
 status core.approval_status NOT NULL DEFAULT 'pending', requested_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz, assigned_to_user_id uuid REFERENCES iam.users(id), decided_by uuid REFERENCES iam.users(id),
 decided_at timestamptz, decision_reason text, signature_reference text
);
ALTER TABLE mcp.tool_calls ADD FOREIGN KEY(approval_id) REFERENCES mcp.human_approvals(id);
CREATE TABLE mcp.context_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES mcp.requests(id) ON DELETE CASCADE, context_type text NOT NULL,
 entity_type text NOT NULL, entity_id uuid NOT NULL, access_mode text NOT NULL,
 classification core.data_classification NOT NULL, purpose_of_use text, linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE mcp.result_artifacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 request_id uuid REFERENCES mcp.requests(id) ON DELETE CASCADE, tool_call_id uuid REFERENCES mcp.tool_calls(id) ON DELETE CASCADE,
 file_id uuid REFERENCES integration.files(id), resource_uri text, artifact_type text NOT NULL, title text,
 classification core.data_classification NOT NULL, contains_phi boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(file_id,resource_uri)=1)
);
CREATE TABLE mcp.response_cache (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 cache_namespace text NOT NULL, cache_key core.sha256_hex NOT NULL, value_redacted jsonb NOT NULL,
 classification core.data_classification NOT NULL, contains_phi boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 source_versions jsonb NOT NULL DEFAULT '{}', UNIQUE(tenant_id,cache_namespace,cache_key)
);
CREATE TABLE mcp.rate_limit_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, scope_type text NOT NULL, scope_identifier text, method_pattern text,
 limit_count integer NOT NULL CHECK(limit_count>0), window_seconds integer NOT NULL CHECK(window_seconds>0),
 burst_count integer, status core.record_status NOT NULL DEFAULT 'active',
 UNIQUE NULLS NOT DISTINCT(tenant_id,name,scope_type,scope_identifier,method_pattern)
);
CREATE TABLE mcp.usage_buckets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 rate_limit_policy_id uuid NOT NULL REFERENCES mcp.rate_limit_policies(id) ON DELETE CASCADE,
 bucket_key text NOT NULL, window_start timestamptz NOT NULL, window_end timestamptz NOT NULL,
 request_count integer NOT NULL DEFAULT 0, last_request_at timestamptz,
 UNIQUE(rate_limit_policy_id,bucket_key,window_start)
);
CREATE TABLE mcp.protocol_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE CASCADE,
 server_id uuid REFERENCES mcp.servers(id) ON DELETE CASCADE,
 client_session_id uuid REFERENCES mcp.client_sessions(id) ON DELETE SET NULL,
 request_id uuid REFERENCES mcp.requests(id) ON DELETE SET NULL, level text NOT NULL, logger text,
 message text NOT NULL, data_redacted jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now(), trace_id text
);
CREATE INDEX protocol_logs_time_idx ON mcp.protocol_logs(tenant_id,occurred_at DESC);

-- COMMUNICATIONS / ESCALATION
CREATE TABLE comms.channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name citext NOT NULL, channel_type text NOT NULL, provider text, configuration_reference text,
 status core.record_status NOT NULL DEFAULT 'active', supports_acknowledgement boolean NOT NULL DEFAULT false,
 max_payload_bytes integer, UNIQUE(tenant_id,name)
);
CREATE TABLE comms.recipient_endpoints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 user_id uuid REFERENCES iam.users(id) ON DELETE CASCADE,
 practitioner_id uuid REFERENCES workforce.practitioners(id) ON DELETE CASCADE,
 channel_id uuid NOT NULL REFERENCES comms.channels(id) ON DELETE CASCADE, endpoint_encrypted bytea NOT NULL,
 endpoint_hash core.sha256_hex NOT NULL, priority integer NOT NULL DEFAULT 1, verified_at timestamptz,
 quiet_hours jsonb NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 CHECK(num_nonnulls(user_id,practitioner_id)=1), UNIQUE(channel_id,endpoint_hash)
);
CREATE TABLE comms.templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 template_key citext NOT NULL, channel_type text NOT NULL, locale text NOT NULL DEFAULT 'en-US', subject_template text,
 body_template text NOT NULL, variables_schema jsonb NOT NULL, classification core.data_classification NOT NULL DEFAULT 'internal',
 contains_phi boolean NOT NULL DEFAULT false, status core.record_status NOT NULL DEFAULT 'active', version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,template_key,channel_type,locale,version)
);
CREATE TABLE comms.messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 incident_id uuid REFERENCES incident.incidents(id), template_id uuid REFERENCES comms.templates(id), message_type text NOT NULL,
 subject_redacted text, body_redacted text NOT NULL, classification core.data_classification NOT NULL,
 contains_phi boolean NOT NULL DEFAULT false, priority core.severity_level NOT NULL DEFAULT 'medium',
 status core.message_status NOT NULL DEFAULT 'draft', scheduled_at timestamptz, sent_at timestamptz, expires_at timestamptz,
 requires_acknowledgement boolean NOT NULL DEFAULT false, acknowledgement_deadline_at timestamptz,
 created_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE comms.message_recipients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 message_id uuid NOT NULL REFERENCES comms.messages(id) ON DELETE CASCADE,
 recipient_endpoint_id uuid REFERENCES comms.recipient_endpoints(id), recipient_user_id uuid REFERENCES iam.users(id),
 recipient_practitioner_id uuid REFERENCES workforce.practitioners(id), status text NOT NULL DEFAULT 'queued',
 provider_message_id text, attempted_at timestamptz, delivered_at timestamptz, failed_at timestamptz, failure_reason text,
 UNIQUE NULLS NOT DISTINCT(message_id,recipient_endpoint_id,recipient_user_id,recipient_practitioner_id),
 CHECK(num_nonnulls(recipient_endpoint_id,recipient_user_id,recipient_practitioner_id)=1)
);
CREATE TABLE comms.acknowledgements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 message_recipient_id uuid NOT NULL REFERENCES comms.message_recipients(id) ON DELETE CASCADE,
 acknowledgement_type text NOT NULL, acknowledged_at timestamptz NOT NULL, acknowledged_by uuid,
 response_payload jsonb NOT NULL DEFAULT '{}', signature_reference text, UNIQUE(message_recipient_id,acknowledgement_type)
);
CREATE TABLE comms.escalation_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, trigger_type text NOT NULL, trigger_conditions jsonb NOT NULL,
 status core.record_status NOT NULL DEFAULT 'active', UNIQUE(tenant_id,name)
);
CREATE TABLE comms.escalation_steps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 escalation_policy_id uuid NOT NULL REFERENCES comms.escalation_policies(id) ON DELETE CASCADE,
 step_number integer NOT NULL, delay_minutes integer NOT NULL DEFAULT 0 CHECK(delay_minutes>=0), target_type text NOT NULL,
 target_reference jsonb NOT NULL, channel_preferences text[] NOT NULL DEFAULT '{}',
 stop_on_acknowledgement boolean NOT NULL DEFAULT true, UNIQUE(escalation_policy_id,step_number)
);
CREATE TABLE comms.escalation_instances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 escalation_policy_id uuid NOT NULL REFERENCES comms.escalation_policies(id), source_type text NOT NULL,
 source_id uuid NOT NULL, status text NOT NULL DEFAULT 'active', started_at timestamptz NOT NULL DEFAULT now(),
 current_step_number integer NOT NULL DEFAULT 0, next_step_at timestamptz, ended_at timestamptz, end_reason text
);

-- AUDIT / PROVENANCE
CREATE TABLE audit.audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE SET NULL,
 event_code text NOT NULL, event_action core.action_kind, outcome text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(), recorded_at timestamptz NOT NULL DEFAULT now(),
 actor_kind core.actor_kind NOT NULL, actor_id uuid, actor_display text,
 user_session_id uuid REFERENCES iam.sessions(id) ON DELETE SET NULL,
 mcp_request_id uuid REFERENCES mcp.requests(id) ON DELETE SET NULL,
 source_system_id uuid REFERENCES integration.source_systems(id) ON DELETE SET NULL,
 facility_id uuid REFERENCES core.facilities(id) ON DELETE SET NULL,
 patient_id uuid REFERENCES clinical.patients(id) ON DELETE SET NULL,
 encounter_id uuid REFERENCES clinical.encounters(id) ON DELETE SET NULL, purpose_of_use text,
 ip_address inet, user_agent text, target_entities jsonb NOT NULL DEFAULT '[]',
 details_redacted jsonb NOT NULL DEFAULT '{}', prior_event_hash core.sha256_hex, event_hash core.sha256_hex,
 trace_id text, correlation_id uuid
);
CREATE INDEX audit_events_tenant_time_idx ON audit.audit_events(tenant_id,occurred_at DESC);
CREATE INDEX audit_events_patient_time_idx ON audit.audit_events(patient_id,occurred_at DESC);
CREATE TABLE audit.row_changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE SET NULL,
 schema_name text NOT NULL, table_name text NOT NULL, record_id text,
 operation char(1) NOT NULL CHECK(operation IN('I','U','D')), changed_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid, purpose_of_use text, old_values_redacted jsonb, new_values_redacted jsonb,
 changed_fields text[] NOT NULL DEFAULT '{}', transaction_id bigint NOT NULL DEFAULT txid_current(), correlation_id uuid
);
CREATE INDEX row_changes_record_idx ON audit.row_changes(schema_name,table_name,record_id,changed_at DESC);
CREATE TABLE audit.data_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 actor_kind core.actor_kind NOT NULL, actor_id uuid, patient_id uuid REFERENCES clinical.patients(id),
 encounter_id uuid REFERENCES clinical.encounters(id), resource_type text NOT NULL, resource_id uuid,
 fields_accessed text[] NOT NULL DEFAULT '{}', action core.action_kind NOT NULL DEFAULT 'read',
 purpose_of_use text NOT NULL, legal_basis text, break_glass_session_id uuid REFERENCES iam.break_glass_sessions(id),
 accessed_at timestamptz NOT NULL DEFAULT now(), mcp_request_id uuid REFERENCES mcp.requests(id), source_ip inet,
 outcome text NOT NULL
);
CREATE INDEX data_access_patient_idx ON audit.data_access_events(patient_id,accessed_at DESC);
CREATE TABLE audit.data_exports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 requested_by uuid NOT NULL REFERENCES iam.users(id), requested_at timestamptz NOT NULL, purpose text NOT NULL,
 scope jsonb NOT NULL, format text NOT NULL, classification core.data_classification NOT NULL,
 contains_phi boolean NOT NULL DEFAULT false, status core.execution_status NOT NULL DEFAULT 'queued',
 approved_by uuid REFERENCES iam.users(id), approved_at timestamptz, file_id uuid REFERENCES integration.files(id),
 completed_at timestamptz, expires_at timestamptz, download_count integer NOT NULL DEFAULT 0,
 last_downloaded_at timestamptz, error_detail text
);
CREATE TABLE audit.disclosures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 patient_id uuid REFERENCES clinical.patients(id), disclosure_type text NOT NULL, recipient_name text,
 recipient_organization text, purpose text NOT NULL, legal_basis text, disclosed_at timestamptz NOT NULL,
 disclosed_by uuid REFERENCES iam.users(id), data_categories text[] NOT NULL, records_count integer,
 export_id uuid REFERENCES audit.data_exports(id), authorization_reference text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit.provenance_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE CASCADE,
 target_type text NOT NULL, target_id uuid NOT NULL, activity_type text NOT NULL, occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(), agent_kind core.actor_kind NOT NULL, agent_id uuid, agent_role text,
 source_entities jsonb NOT NULL DEFAULT '[]', derivation_type text, policy_references jsonb NOT NULL DEFAULT '[]',
 location_id uuid REFERENCES capacity.locations(id), encounter_id uuid REFERENCES clinical.encounters(id),
 signature_reference text, details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX provenance_target_idx ON audit.provenance_records(target_type,target_id,occurred_at DESC);
CREATE TABLE audit.security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE SET NULL,
 event_type text NOT NULL, severity core.severity_level NOT NULL, detected_at timestamptz NOT NULL,
 source text NOT NULL, actor_id uuid, source_ip inet, target jsonb, description text NOT NULL,
 indicators jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'open', assigned_to uuid REFERENCES iam.users(id),
 resolved_at timestamptz, resolution text, external_ticket_reference text
);
CREATE TABLE audit.legal_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 hold_name text NOT NULL, matter_reference text NOT NULL, scope jsonb NOT NULL, starts_at timestamptz NOT NULL,
 ends_at timestamptz, status core.record_status NOT NULL DEFAULT 'active', created_by uuid REFERENCES iam.users(id),
 approved_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,matter_reference)
);
CREATE TABLE audit.retention_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 retention_policy_id uuid NOT NULL REFERENCES core.retention_policies(id), target_type text NOT NULL, target_id uuid NOT NULL,
 action text NOT NULL, scheduled_at timestamptz NOT NULL, executed_at timestamptz,
 status core.execution_status NOT NULL DEFAULT 'queued', legal_hold_blocked boolean NOT NULL DEFAULT false,
 result jsonb NOT NULL DEFAULT '{}', error_detail text
);

-- ANALYTICS / REPORTING / DATA QUALITY
CREATE TABLE analytics.metric_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE CASCADE,
 metric_code citext NOT NULL, name text NOT NULL, description text NOT NULL, domain text NOT NULL, unit text,
 aggregation_method text, calculation_expression text, dimensions_schema jsonb NOT NULL DEFAULT '{}',
 classification core.data_classification NOT NULL DEFAULT 'internal', status core.record_status NOT NULL DEFAULT 'active',
 UNIQUE NULLS NOT DISTINCT(tenant_id,metric_code)
);
CREATE TABLE analytics.metric_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 metric_definition_id uuid NOT NULL REFERENCES analytics.metric_definitions(id), facility_id uuid REFERENCES core.facilities(id),
 incident_id uuid REFERENCES incident.incidents(id), candidate_plan_id uuid REFERENCES planning.candidate_plans(id),
 observed_at timestamptz NOT NULL, bucket_start timestamptz, bucket_end timestamptz, value_numeric numeric(24,8),
 value_json jsonb, dimensions jsonb NOT NULL DEFAULT '{}', quality_score core.probability,
 source_kind core.source_kind NOT NULL, source_reference text, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(value_numeric,value_json)=1)
);
CREATE INDEX metric_observations_series_idx ON analytics.metric_observations(metric_definition_id,observed_at DESC);
CREATE TABLE analytics.dashboard_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 name text NOT NULL, dashboard_type text NOT NULL, layout jsonb NOT NULL, filters_schema jsonb NOT NULL DEFAULT '{}',
 required_permissions text[] NOT NULL DEFAULT '{}', status core.record_status NOT NULL DEFAULT 'active',
 created_by uuid REFERENCES iam.users(id), created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name)
);
CREATE TABLE analytics.report_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 report_key citext NOT NULL, name text NOT NULL, description text, query_reference text NOT NULL,
 parameters_schema jsonb NOT NULL DEFAULT '{}', output_formats text[] NOT NULL DEFAULT ARRAY['json'],
 classification core.data_classification NOT NULL, contains_phi boolean NOT NULL DEFAULT false,
 approval_required boolean NOT NULL DEFAULT false, status core.record_status NOT NULL DEFAULT 'active',
 UNIQUE(tenant_id,report_key)
);
CREATE TABLE analytics.report_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 report_definition_id uuid NOT NULL REFERENCES analytics.report_definitions(id), requested_by uuid REFERENCES iam.users(id),
 requested_at timestamptz NOT NULL DEFAULT now(), parameters jsonb NOT NULL DEFAULT '{}',
 status core.execution_status NOT NULL DEFAULT 'queued', started_at timestamptz, completed_at timestamptz,
 output_file_id uuid REFERENCES integration.files(id), row_count bigint, error_detail text,
 correlation_id uuid NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE analytics.data_quality_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES core.tenants(id) ON DELETE CASCADE,
 rule_code citext NOT NULL, name text NOT NULL, domain text NOT NULL, target_entity_type text NOT NULL,
 severity core.severity_level NOT NULL, expression_language text NOT NULL, rule_expression text NOT NULL,
 threshold jsonb, status core.record_status NOT NULL DEFAULT 'active', UNIQUE NULLS NOT DISTINCT(tenant_id,rule_code)
);
CREATE TABLE analytics.data_quality_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 data_quality_rule_id uuid NOT NULL REFERENCES analytics.data_quality_rules(id), evaluated_at timestamptz NOT NULL,
 scope jsonb NOT NULL, total_records bigint NOT NULL, failed_records bigint NOT NULL, score core.percentage,
 sample_failures jsonb NOT NULL DEFAULT '[]', status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE analytics.model_monitoring (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE,
 model_type text NOT NULL, model_id uuid NOT NULL, observed_at timestamptz NOT NULL, metric_code text NOT NULL,
 metric_value numeric(24,8), threshold_value numeric(24,8), status text NOT NULL,
 dimensions jsonb NOT NULL DEFAULT '{}', details jsonb NOT NULL DEFAULT '{}'
);

-- OPERATIONAL READ MODELS
CREATE OR REPLACE VIEW capacity.v_current_bed_state AS
SELECT
  b.tenant_id,
  b.id AS bed_id,
  b.location_id,
  b.bed_code,
  b.bed_type,
  COALESCE(e.new_state, b.state) AS current_state,
  e.occurred_at AS state_observed_at,
  ba.id AS active_assignment_id,
  ba.patient_id,
  ba.encounter_id,
  bh.id AS active_hold_id,
  bh.hold_type,
  bh.expires_at AS hold_expires_at,
  b.licensed,
  b.staffed_by_default,
  b.status
FROM capacity.beds b
LEFT JOIN LATERAL (
  SELECT x.*
  FROM capacity.bed_status_events x
  WHERE x.bed_id = b.id
  ORDER BY x.occurred_at DESC, x.created_at DESC
  LIMIT 1
) e ON true
LEFT JOIN LATERAL (
  SELECT x.*
  FROM capacity.bed_assignments x
  WHERE x.bed_id = b.id
    AND x.starts_at <= now()
    AND (x.ends_at IS NULL OR x.ends_at > now())
  ORDER BY x.starts_at DESC
  LIMIT 1
) ba ON true
LEFT JOIN LATERAL (
  SELECT x.*
  FROM capacity.bed_holds x
  WHERE x.bed_id = b.id
    AND x.released_at IS NULL
    AND x.starts_at <= now()
    AND x.expires_at > now()
  ORDER BY x.starts_at DESC
  LIMIT 1
) bh ON true;

CREATE OR REPLACE VIEW workforce.v_practitioner_eligibility AS
SELECT
  p.tenant_id,
  p.id AS practitioner_id,
  pr.id AS practitioner_role_id,
  pr.role_definition_id,
  pr.facility_id,
  pr.department_id,
  pr.specialty_code,
  pr.valid_from,
  pr.valid_to,
  p.status AS practitioner_status,
  pr.status AS role_status,
  (
    SELECT count(*)
    FROM workforce.licenses l
    WHERE l.practitioner_id = p.id
      AND l.status = 'active'
      AND (l.expires_on IS NULL OR l.expires_on >= current_date)
  ) AS current_license_count,
  (
    SELECT count(*)
    FROM workforce.certifications c
    WHERE c.practitioner_id = p.id
      AND c.status = 'active'
      AND (c.expires_on IS NULL OR c.expires_on >= current_date)
  ) AS current_certification_count,
  (
    SELECT count(*)
    FROM workforce.practitioner_privileges pp
    WHERE pp.practitioner_id = p.id
      AND pp.status = 'active'
      AND pp.valid_from <= now()
      AND (pp.valid_to IS NULL OR pp.valid_to > now())
      AND (pr.facility_id IS NULL OR pp.facility_id IS NULL OR pp.facility_id = pr.facility_id)
  ) AS current_privilege_count,
  (
    SELECT count(*)
    FROM workforce.practitioner_restrictions r
    WHERE r.practitioner_id = p.id
      AND r.status = 'active'
      AND r.valid_from <= now()
      AND (r.valid_to IS NULL OR r.valid_to > now())
  ) AS active_restriction_count,
  (
    SELECT count(*)
    FROM workforce.fatigue_events f
    WHERE f.practitioner_id = p.id
      AND f.observed_at >= now() - interval '24 hours'
      AND f.risk_level IN ('high','critical')
  ) AS recent_high_fatigue_event_count,
  (
    p.status = 'active'
    AND pr.status = 'active'
    AND pr.valid_from <= now()
    AND (pr.valid_to IS NULL OR pr.valid_to > now())
  ) AS role_current,
  CASE
    WHEN p.status <> 'active'
      OR pr.status <> 'active'
      OR pr.valid_from > now()
      OR (pr.valid_to IS NOT NULL AND pr.valid_to <= now())
      THEN 'blocked_inactive_role'
    WHEN EXISTS (
      SELECT 1
      FROM workforce.practitioner_restrictions r
      WHERE r.practitioner_id = p.id
        AND r.status = 'active'
        AND r.valid_from <= now()
        AND (r.valid_to IS NULL OR r.valid_to > now())
    ) THEN 'blocked_restriction'
    WHEN EXISTS (
      SELECT 1
      FROM workforce.fatigue_events f
      WHERE f.practitioner_id = p.id
        AND f.observed_at >= now() - interval '24 hours'
        AND f.risk_level IN ('high','critical')
    ) THEN 'blocked_fatigue'
    ELSE 'requires_role_policy_check'
  END AS eligibility_status
FROM workforce.practitioners p
JOIN workforce.practitioner_roles pr ON pr.practitioner_id = p.id;

CREATE OR REPLACE VIEW clinical.v_active_queue_pressure AS
SELECT
  qd.tenant_id,
  qd.id AS queue_definition_id,
  qd.facility_id,
  qd.department_id,
  qd.code AS queue_code,
  qd.name AS queue_name,
  qd.service_level_minutes,
  count(qe.id) AS active_entries,
  count(qe.id) FILTER (
    WHERE extract(epoch FROM (now() - qe.entered_at))/60.0 > qd.service_level_minutes
  ) AS entries_over_service_level,
  COALESCE(avg(extract(epoch FROM (now() - qe.entered_at))/60.0),0)::numeric(18,2) AS average_wait_minutes,
  COALESCE(max(extract(epoch FROM (now() - qe.entered_at))/60.0),0)::numeric(18,2) AS longest_wait_minutes,
  COALESCE(percentile_cont(0.90) WITHIN GROUP (
    ORDER BY extract(epoch FROM (now() - qe.entered_at))/60.0
  ),0)::numeric(18,2) AS p90_wait_minutes,
  COALESCE(avg(qe.priority_score),0)::numeric(18,4) AS average_priority_score
FROM clinical.queue_definitions qd
LEFT JOIN clinical.queue_entries qe
  ON qe.queue_definition_id = qd.id
 AND qe.exited_at IS NULL
 AND qe.queue_status NOT IN ('completed','cancelled','left_without_being_seen')
WHERE qd.status = 'active'
GROUP BY qd.tenant_id, qd.id, qd.facility_id, qd.department_id,
         qd.code, qd.name, qd.service_level_minutes;

CREATE OR REPLACE VIEW planning.v_plan_gate_summary AS
SELECT
  cp.tenant_id,
  cp.id AS candidate_plan_id,
  cp.incident_id,
  cp.status AS plan_status,
  count(v.id) AS total_violations,
  count(v.id) FILTER (WHERE v.status IN ('open','acknowledged')) AS unresolved_violations,
  count(v.id) FILTER (
    WHERE v.status IN ('open','acknowledged')
      AND v.constraint_strength = 'hard'
  ) AS unresolved_hard_violations,
  count(v.id) FILTER (
    WHERE v.status IN ('open','acknowledged')
      AND v.severity = 'critical'
  ) AS unresolved_critical_violations,
  count(v.id) FILTER (WHERE v.status = 'accepted' AND v.override_request_id IS NOT NULL) AS accepted_override_violations,
  CASE
    WHEN count(v.id) FILTER (
      WHERE v.status IN ('open','acknowledged')
        AND (v.constraint_strength = 'hard' OR v.severity = 'critical')
    ) > 0 THEN 'blocked'
    WHEN count(v.id) FILTER (WHERE v.status IN ('open','acknowledged')) > 0 THEN 'conditional'
    ELSE 'clear'
  END AS gate_status,
  max(v.detected_at) AS last_violation_detected_at
FROM planning.candidate_plans cp
LEFT JOIN policy.violations v ON v.plan_id = cp.id
GROUP BY cp.tenant_id, cp.id, cp.incident_id, cp.status;

-- BASE PERMISSION CATALOG; TENANT ROLES MAP TO THESE KEYS
INSERT INTO iam.permissions(permission_key,resource_type,action,description,is_phi_access,requires_purpose_of_use)
VALUES
 ('surge.capacity.read','capacity','read','Read operational capacity and bed state',false,false),
 ('surge.queue.read','clinical_queue','read','Read queue pressure and waiting-time projections',true,true),
 ('surge.staffing.read','workforce','read','Read staffing availability, qualifications and fatigue indicators',false,true),
 ('surge.patient.minimum_read','patient','read','Read the minimum patient facts required for placement and isolation checks',true,true),
 ('surge.incident.manage','incident','update','Create and manage incident command records and operational periods',false,false),
 ('surge.scenario.create','scenario','create','Create surge planning scenarios and immutable scenario snapshots',false,false),
 ('surge.plan.generate','candidate_plan','execute','Run forecasts and generate candidate surge plans',true,true),
 ('surge.plan.read','candidate_plan','read','Read candidate plans, scores, assumptions and evidence',true,true),
 ('surge.policy.evaluate','policy_evaluation','execute','Evaluate plans and actions against active policy rule sets',true,true),
 ('surge.override.request','policy_override','create','Request a documented policy exception',true,true),
 ('surge.override.approve','policy_override','approve','Approve or reject policy exceptions within delegated authority',true,true),
 ('surge.plan.submit','candidate_plan','update','Submit a candidate plan to an approval workflow',true,true),
 ('surge.plan.approve','candidate_plan','approve','Approve or reject a candidate surge plan',true,true),
 ('surge.plan.execute','plan_execution','execute','Initiate execution of an approved, policy-cleared surge plan',true,true),
 ('surge.execution.manage','plan_execution','update','Manage execution steps, deviations and rollback',true,true),
 ('surge.staff.assign','staff_assignment','execute','Assign qualified staff to surge duties',true,true),
 ('surge.bed.allocate','bed_assignment','execute','Allocate or reserve beds under an approved plan',true,true),
 ('surge.space.activate','surge_space','execute','Activate a validated contingency or crisis care space',false,true),
 ('surge.transfer.request','transfer_request','create','Create inter-facility or intra-facility transfer requests',true,true),
 ('surge.integration.manage','integration','update','Configure and operate EHR, FHIR, HL7 and webhook integrations',true,true),
 ('surge.policy.admin','policy','update','Import, test, publish and retire policy rules',true,true),
 ('surge.audit.read','audit','read','Read audit, provenance and disclosure records',true,true),
 ('surge.security.admin','security','update','Manage authentication, authorization and security incidents',true,true),
 ('surge.mcp.admin','mcp','update','Register MCP clients, tools, resources, prompts and authorization rules',false,false)
ON CONFLICT(permission_key) DO NOTHING;

-- AUDIT CAPTURE
CREATE OR REPLACE FUNCTION audit.capture_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, audit, core
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_tenant uuid;
  v_record_id text;
  v_actor uuid;
  v_correlation uuid;
  v_operation char(1);
  v_changed_fields text[] := ARRAY[]::text[];
  v_sensitive_keys text[] := ARRAY[
    'legal_name_encrypted','birth_date_encrypted','identifier_value_encrypted',
    'license_number_encrypted','details_encrypted','contact_encrypted',
    'credential_reference','key_hash','token_jti_hash','payload_encrypted',
    'content_encrypted','response_encrypted','request_body_encrypted',
    'response_body_encrypted','recipient_address_encrypted'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_operation := 'I';
    v_new := to_jsonb(NEW) - v_sensitive_keys;
    v_record_id := COALESCE(v_new->>'id', v_new->>'event_id', v_new->>'message_id');
  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'U';
    v_old := to_jsonb(OLD) - v_sensitive_keys;
    v_new := to_jsonb(NEW) - v_sensitive_keys;
    v_record_id := COALESCE(v_new->>'id', v_old->>'id', v_new->>'event_id', v_old->>'event_id');
    SELECT COALESCE(array_agg(k ORDER BY k), ARRAY[]::text[])
      INTO v_changed_fields
    FROM jsonb_object_keys(COALESCE(v_old,'{}'::jsonb) || COALESCE(v_new,'{}'::jsonb)) AS x(k)
    WHERE COALESCE(v_old,'{}'::jsonb)->k IS DISTINCT FROM COALESCE(v_new,'{}'::jsonb)->k;
  ELSE
    v_operation := 'D';
    v_old := to_jsonb(OLD) - v_sensitive_keys;
    v_record_id := COALESCE(v_old->>'id', v_old->>'event_id', v_old->>'message_id');
  END IF;

  BEGIN
    v_tenant := COALESCE(
      NULLIF(COALESCE(v_new->>'tenant_id', v_old->>'tenant_id'),'')::uuid,
      NULLIF(current_setting('app.tenant_id', true),'')::uuid
    );
  EXCEPTION WHEN invalid_text_representation THEN
    v_tenant := NULL;
  END;

  BEGIN
    v_actor := NULLIF(current_setting('app.actor_id', true),'')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_actor := NULL;
  END;

  BEGIN
    v_correlation := NULLIF(current_setting('app.correlation_id', true),'')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_correlation := NULL;
  END;

  INSERT INTO audit.row_changes(
    tenant_id, schema_name, table_name, record_id, operation,
    actor_id, purpose_of_use, old_values_redacted, new_values_redacted,
    changed_fields, transaction_id, correlation_id
  ) VALUES (
    v_tenant, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, v_operation,
    v_actor, NULLIF(current_setting('app.purpose_of_use', true),''), v_old, v_new,
    v_changed_fields, txid_current(), v_correlation
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION core.set_updated_at_and_row_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END;
$$;

-- UPDATED-AT AND OPTIMISTIC-CONCURRENCY TRIGGERS
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name,
           bool_or(a.attname = 'row_version') AS has_row_version
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    WHERE c.relkind = 'r'
      AND n.nspname IN ('core','iam','terminology','workforce','capacity','clinical','incident','policy','planning','integration','mcp','comms','analytics')
      AND EXISTS (
        SELECT 1 FROM pg_attribute ux
        WHERE ux.attrelid = c.oid AND ux.attname = 'updated_at' AND ux.attnum > 0 AND NOT ux.attisdropped
      )
    GROUP BY n.nspname, c.relname
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_row ON %I.%I', r.schema_name, r.table_name);
    IF r.has_row_version THEN
      EXECUTE format(
        'CREATE TRIGGER trg_touch_row BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION core.set_updated_at_and_row_version()',
        r.schema_name, r.table_name
      );
    ELSE
      EXECUTE format(
        'CREATE TRIGGER trg_touch_row BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION core.set_updated_at()',
        r.schema_name, r.table_name
      );
    END IF;
  END LOOP;
END $$;

-- TENANT ISOLATION: DENY BY DEFAULT WHEN app.tenant_id IS UNSET
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('core','iam','workforce','capacity','clinical','incident','policy','planning','integration','mcp','comms','audit','analytics')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I.%I', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I.%I USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      r.schema_name, r.table_name
    );
  END LOOP;
END $$;

-- IMMUTABLE AUDIT/PROVENANCE RECORDS FOR APPLICATION ROLES
CREATE OR REPLACE FUNCTION audit.reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'append-only table %.% cannot be updated or deleted', TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_events','row_changes','data_access_events','disclosures',
    'provenance_records','security_events','retention_actions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_append_only ON audit.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_append_only BEFORE UPDATE OR DELETE ON audit.%I FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation()',
      t
    );
  END LOOP;
END $$;

-- ROW-CHANGE AUDIT TRIGGERS FOR MUTABLE TENANT TABLES
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname IN ('core','iam','workforce','capacity','clinical','incident','policy','planning','integration','mcp','comms','analytics')
      AND c.relname NOT IN ('inbox_events','outbox_events','protocol_logs','metric_observations','model_monitoring')
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_row_change ON %I.%I', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_row_change AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit.capture_row_change()',
      r.schema_name, r.table_name
    );
  END LOOP;
END $$;

-- PERFORMANCE INDEXES FOR OPERATIONAL PATHS
CREATE INDEX IF NOT EXISTS encounters_active_facility_idx
  ON clinical.encounters(tenant_id,facility_id,started_at)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS encounters_patient_active_idx
  ON clinical.encounters(tenant_id,patient_id,started_at DESC)
  WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS isolation_requirements_active_idx
  ON clinical.isolation_requirements(tenant_id,encounter_id,starts_at)
  WHERE ends_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS shifts_facility_time_idx
  ON workforce.shifts(tenant_id,facility_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS shift_assignments_practitioner_idx
  ON workforce.shift_assignments(tenant_id,practitioner_id,created_at DESC)
  WHERE status IN ('planned','offered','accepted','checked_in');
CREATE INDEX IF NOT EXISTS licenses_expiry_idx
  ON workforce.licenses(tenant_id,expires_on)
  WHERE status = 'active' AND expires_on IS NOT NULL;
CREATE INDEX IF NOT EXISTS certifications_expiry_idx
  ON workforce.certifications(tenant_id,expires_on)
  WHERE status = 'active' AND expires_on IS NOT NULL;
CREATE INDEX IF NOT EXISTS practitioner_privileges_current_idx
  ON workforce.practitioner_privileges(tenant_id,practitioner_id,facility_id,valid_from,valid_to)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS bed_assignments_active_idx
  ON capacity.bed_assignments(tenant_id,bed_id,starts_at DESC)
  WHERE ends_at IS NULL;
CREATE INDEX IF NOT EXISTS bed_holds_active_idx
  ON capacity.bed_holds(tenant_id,bed_id,starts_at,expires_at)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS inventory_lots_available_idx
  ON capacity.inventory_lots(tenant_id,inventory_item_id,facility_id,expires_on)
  WHERE quantity_on_hand > quantity_reserved + quantity_quarantined;
CREATE INDEX IF NOT EXISTS incidents_active_idx
  ON incident.incidents(tenant_id,status,severity,started_at DESC)
  WHERE status NOT IN ('closed','cancelled');
CREATE INDEX IF NOT EXISTS policy_violations_open_idx
  ON policy.violations(tenant_id,plan_id,severity,constraint_strength,detected_at DESC)
  WHERE status IN ('open','acknowledged');
CREATE INDEX IF NOT EXISTS evaluation_sessions_subject_idx
  ON policy.evaluation_sessions(tenant_id,subject_type,subject_id,started_at DESC);
CREATE INDEX IF NOT EXISTS candidate_plans_scenario_idx
  ON planning.candidate_plans(tenant_id,scenario_version_id,status,generated_at DESC);
CREATE INDEX IF NOT EXISTS plan_actions_schedule_idx
  ON planning.plan_actions(tenant_id,candidate_plan_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS execution_steps_pending_idx
  ON planning.execution_steps(tenant_id,plan_execution_id,status)
  WHERE status IN ('queued','running','partial');
CREATE INDEX IF NOT EXISTS mcp_requests_correlation_idx
  ON mcp.requests(tenant_id,correlation_id,requested_at DESC);
CREATE INDEX IF NOT EXISTS mcp_tool_calls_status_idx
  ON mcp.tool_calls(tenant_id,status,started_at DESC);
CREATE INDEX IF NOT EXISTS outbox_unpublished_tenant_idx
  ON integration.outbox_events(tenant_id,available_at,occurred_at)
  WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS webhook_delivery_retry_idx
  ON integration.webhook_deliveries(tenant_id,outcome,next_retry_at)
  WHERE outcome IN ('pending','retrying');
CREATE INDEX IF NOT EXISTS audit_events_actor_time_idx
  ON audit.audit_events(tenant_id,actor_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_patient_time_cover_idx
  ON audit.audit_events(tenant_id,patient_id,occurred_at DESC)
  WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS data_access_patient_time_idx
  ON audit.data_access_events(tenant_id,patient_id,accessed_at DESC)
  WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS metric_observations_metric_time_idx
  ON analytics.metric_observations(tenant_id,metric_definition_id,observed_at DESC);

COMMIT;
