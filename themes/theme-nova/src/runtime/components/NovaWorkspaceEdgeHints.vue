<script setup lang="ts">
import WorkspaceEdgeHintsBase from '@owdproject/kit-theme/runtime/components/WorkspaceEdgeHintsBase.vue'
import { useNovaWorkspaces } from '../composables/useNovaWorkspaces'

const { enabled: workspacesEnabled } = useNovaWorkspaces()
</script>

<template>
  <WorkspaceEdgeHintsBase :enabled="workspacesEnabled" />
</template>
