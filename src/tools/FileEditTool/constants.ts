// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .hawk/ folder
export const HAWK_FOLDER_PERMISSION_PATTERN = '/.hawk/**'

// Permission pattern for granting session-level access to the global ~/.hawk/ folder
export const GLOBAL_HAWK_FOLDER_PERMISSION_PATTERN = '~/.hawk/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
