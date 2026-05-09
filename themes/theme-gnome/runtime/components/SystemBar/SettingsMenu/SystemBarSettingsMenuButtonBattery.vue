<script setup lang="ts">
import { useBattery } from '@vueuse/core'

const { charging, chargingTime, dischargingTime, level } = useBattery()

function getBatteryIconSimplifiedDynamic(level: number): string {
  const percentage = Math.round(level * 100)
  const tens = Math.floor(percentage / 10) * 10

  return `mdi:battery-charging-${tens}`
}
</script>

<template>
  <Button size="large" rounded>
    <Icon :name="getBatteryIconSimplifiedDynamic(level)" />
    {{ level * 100 }}%
  </Button>
</template>

<style scoped lang="scss"></style>
