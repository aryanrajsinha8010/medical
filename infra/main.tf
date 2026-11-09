# =============================================================================
# SwasthyaBillCheck (NMBTP) — Cloud Infrastructure as Code (Terraform)
# Region: AWS ap-south-1 (Mumbai, India) — DPDP Act 2023 Data Residency
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default     = "ap-south-1"
  description = "AWS India (Mumbai) Region for DPDP Act 2023 Compliance"
}

resource "aws_kms_key" "swasthya_at_rest" {
  description             = "SwasthyaBillCheck KMS Key for Encrypted-at-Rest Bill & Ledger Storage"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_s3_bucket" "ephemeral_bill_uploads" {
  bucket = "swasthyabillcheck-ephemeral-uploads-ap-south-1"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "upload_enc" {
  bucket = aws_s3_bucket.ephemeral_bill_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.swasthya_at_rest.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "auto_delete_n_days" {
  bucket = aws_s3_bucket.ephemeral_bill_uploads.id
  rule {
    id     = "dpdp-auto-delete-raw-images"
    status = "Enabled"
    expiration {
      days = 7
    }
  }
}

