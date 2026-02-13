# Privacy Policy — Evidence Assessment Add-on

**Last updated:** February 12, 2026

## Overview

Evidence Assessment is a Google Docs add-on that helps users systematically assess and document the evidence quality, agreement level, and confidence of claims in policy documents. This privacy policy explains how the add-on handles your data.

## Data Collection and Storage

### What data the add-on accesses

- **Document content:** The add-on reads text you select in your Google Doc to create evidence assessments. It also writes superscript markers and an appendix section into the document.
- **User email:** Your Google account email is stored as metadata on assessments you create (to track authorship).
- **Google Drive (export only):** When you use the Export feature, the add-on creates a file in your Google Drive containing your assessment data.

### Where data is stored

All assessment data is stored **entirely within the Google Doc itself**, using Google Docs' built-in DocumentProperties storage. This means:

- Your data stays in your document — it is never transmitted to any external server.
- Your data is subject to Google's own security and privacy protections.
- If you delete the document, the assessment data is deleted with it.
- Exported files are saved only to your own Google Drive.

### What data is NOT collected

- The add-on does **not** collect analytics or usage data.
- The add-on does **not** send data to any third-party service.
- The add-on does **not** store data outside of your Google Workspace environment.
- The add-on does **not** use cookies or tracking technologies.

## Data Sharing

The add-on does not share your data with anyone. Since all data resides in your Google Doc, sharing is governed by the document's own sharing settings — if you share the document, collaborators with edit access can view and modify assessments.

## Data Retention

Assessment data persists as long as the Google Doc exists. You can delete individual assessments through the Manage Assessments dialog, or delete all data by removing the document.

## Permissions

The add-on requests the following Google OAuth scopes:

| Permission | Purpose |
|-----------|---------|
| `documents.currentonly` | Read and write content in the current document (assessments, markers, appendix) |
| `script.container.ui` | Display the sidebar and dialog interfaces |
| `drive.file` | Create export files (CSV/JSON) in your Google Drive |

These are the minimum permissions required for the add-on to function. The `drive.file` scope only grants access to files created by the add-on, not your entire Drive.

## Changes to This Policy

If this privacy policy is updated, the changes will be posted here with an updated date. Continued use of the add-on after changes constitutes acceptance of the updated policy.

## Contact

If you have questions about this privacy policy or the add-on's data practices, please open an issue at: https://github.com/nmatouka/google-docs-evidence-assessment/issues
