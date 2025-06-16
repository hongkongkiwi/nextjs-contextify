import { defineConfig } from 'bumpp'

export default defineConfig({
  // Files to update version in
  files: [
    'package.json'
  ],
  
  // Commit message template
  commit: 'chore: bump version to v%s',
  
  // Tag message template  
  tag: 'v%s',
  
  // Push changes and tags to remote
  push: true,
  
  // Confirm before making changes
  confirm: true,
  
  // Show all files that will be updated
  all: true
}) 