# Web UI Delta Spec

## Requirements

### Requirement: Auth captcha controls have consistent proportions

The web login captcha preview, captcha input, and refresh button must use visually compatible sizing so the captcha image is not compressed or crowded by the refresh action.

### Requirement: Prompt tags follow the folder list

The prompt tag section in the sidebar must appear after the folder section in normal vertical flow, instead of being hard-pinned to the bottom of the sidebar.

### Requirement: Prompt tags remain a tag cloud

Prompt tags must render as wrapping, self-width chips. The default expanded state must show more than the previous eight-tag limit, and overflow must remain scrollable when the tag set is very large.

### Requirement: Prompt tags are ordered by usage

Prompt tags in the sidebar must be ordered by associated prompt count descending. Tags with the same count must be ordered by name. Tags from the durable tag catalog with no associated prompts remain visible with count zero.

