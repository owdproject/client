<script setup>
import { onMounted } from 'vue'

const bootDisplay = {
  container: null,
  timeout: 0,
  screenplay: [
    { delay: 500, type: 'writeln', text: 'Award Modular BIOS v6.00PG' },
    { delay: 0, type: 'writeln', text: 'ACPI BIOS Revision 1.0A' },
    { delay: 0, type: 'writeln', text: 'ASUS P4P800 Deluxe Series BIOS' },
    { delay: 0, type: 'writeln', text: 'Checking Hardware...' },
    { delay: 1000, type: 'clear' },

    {
      delay: 500,
      type: 'writeln',
      text: 'Intel(R) Pentium(R) 4 CPU 3.00GHz',
    },
    { delay: 0, type: 'writeln', text: '640 KB System RAM Passed' },
    { delay: 0, type: 'writeln', text: '128 MB Video RAM Passed' },
    { delay: 500, type: 'writeln', text: 'PCI device listing...' },
    {
      delay: 250,
      type: 'writeln',
      text: '  Bus:00, Device:01, Function:00 - VGA Compatible Controller',
    },
    {
      delay: 250,
      type: 'writeln',
      text: '  Bus:00, Device:02, Function:00 - Ethernet Controller',
    },
    { delay: 1000, type: 'clear' },

    {
      delay: 500,
      type: 'writeln',
      text: 'Detecting IDE Primary Master... IDE Hard Drive',
    },
    {
      delay: 500,
      type: 'writeln',
      text: 'Detecting IDE Primary Slave... None',
    },
    {
      delay: 500,
      type: 'writeln',
      text: 'Detecting IDE Secondary Master... CD-ROM',
    },
    {
      delay: 500,
      type: 'writeln',
      text: 'Detecting IDE Secondary Slave... None',
    },
    { delay: 1500, type: 'writeln', text: '&nbsp;' },

    { delay: 1500, type: 'writeln', text: 'LSI Logic MegaRAID BIOS' },
    { delay: 0, type: 'writeln', text: 'Initializing SCSI Controllers...' },
    { delay: 1000, type: 'clear' },

    {
      delay: 500,
      type: 'writeln',
      text: 'Phoenix - AwardBIOS CMOS Setup Utility',
    },
    {
      delay: 0,
      type: 'writeln',
      text: 'Copyright (C) 1984-2002 Phoenix Technologies Ltd.',
    },
    { delay: 1000, type: 'writeln', text: 'Press DEL to enter SETUP' },
    { delay: 0, type: 'writeln', text: 'Press F12 for Boot Menu' },
    { delay: 1500, type: 'writeln', text: '&nbsp;' },
    { delay: 1500, type: 'writeln', text: 'Booting from Hard Disk...' },
    { delay: 2000, type: 'redirect' },
  ],
  setup: function () {
    this.container = document.getElementById('owd-boot-content')
    this.initialize()
  },
  initialize: function () {
    this.screenplay.forEach((action) => this.run(action))
  },
  run: function (action) {
    this.timeout += action.delay

    setTimeout(() => {
      switch (action.type) {
        case 'writeln':
          this.writeln(action.text)
          break
        case 'write':
          this.write(action.text)
          break
        case 'clear':
          this.clear()
          break
        case 'redirect':
          navigateTo('/')
          break
      }
    }, this.timeout)
  },
  writeln: function (text) {
    const line = document.createElement('div')
    line.innerHTML = text
    this.container.appendChild(line)
  },
  write: function (text) {
    this.container.innerHTML += text
  },
  clear: function () {
    this.container.innerHTML = ''
  },
}

onMounted(() => {
  bootDisplay.setup()
})
</script>

<template>
  <div class="owd-boot">
    <div class="owd-boot__content" id="owd-boot-content" />
  </div>
</template>

<style scoped lang="scss">
.owd-boot {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
}

.owd-boot__content {
  border-color: #cccccc;
  border-style: solid;
  border-width: 2px;
  padding: 16px;
  max-width: 800px;
  min-width: 600px;
  width: 60vw;
  max-height: 600px;
  min-height: 400px;
  height: 60vh;
  font-size: 14px;
  overflow-y: auto;
  color: #cccccc;
  font-family: 'Courier New', Courier, monospace, FreeMono;
  white-space: pre-wrap;
}
</style>
