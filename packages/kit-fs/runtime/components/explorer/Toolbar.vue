<script setup lang="ts">
defineProps<{
  arrowsDisabled: boolean
}>()

defineEmits(['back', 'forward', 'up', 'cut', 'copy', 'paste', 'undo', 'delete', 'properties'])
</script>

<template>
  <div>
    <Button :disabled="arrowsDisabled" variant="text" @click="$emit('back')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhHgAaAKECAAAAAAD//7KysrKysiH5BAEKAAIALAAAAAAeABoAAAJblI8GkO2vGJxtLYqPlRmuEFydB4DimHxgyKFauZ6uurLbjbd0nPfiXgsKgz/Y8DjcIJdJC/PJi0CZxelSBrT5cIjstlcxslwpsYwsHaO7sPNasHmX3XL62/4oAAA7"
          style="width: 15px"
        />
      </div>
      {{$t('apps.explorer.action.back')}}
    </Button>
    <Button :disabled="arrowsDisabled" variant="text" @click="$emit('forward')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhHgAaAKECAAAAAAD//7KysrKysiH5BAEKAAIALAAAAAAeABoAAAJblI8pAOrvGJyQSYqNbRmzEFzd84XcGAEgKKJHyZ7vRtfw2tq6teLy3QsKgxfg8NgrqpBM4aYJ9RmjRM6U6tPsdM7f1tZ1zZIy8a1lXqLFC3WZvWGn1nK6vI0pAAA7"
          style="width: 15px"
        />
      </div>
      {{$t('apps.explorer.action.forward')}}
    </Button>
    <Divider layout="vertical" />
    <Button variant="text" @click="$emit('up')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhKAAiAKEDAAAAAP//AP///7KysiH5BAEKAAMALAAAAAAoACIAAAKnnA+pu+cP42BUyRtTCELs/nlBgpUTEKacSJoZuqpgPALuo9Hzztr3WQkKh8SicciTiZK6ZS/BjDqVqgW1eZVasVypcqEFeLtP8XQFPY9nWx5lrRa0ne94Vq5wC+HVPH1vxzXXd3c3SJPD1wQWl1Yo6Pdl9sh0yAajqJd4tkn557g4SXbFKJnJqUB6lBraibjq2lE6SlsZWRtoG5vLG2LZiwsrPExcVAAAOw=="
          style="width: 15px"
        />
      </div>
      {{$t('apps.explorer.action.up')}}
    </Button>
    <Button variant="text" @click="$emit('cut')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhHgAoAKEDAAAAAAD//////7KysiH5BAEKAAMALAAAAAAeACgAAAK73IBgy22pGnR0TQuEQLUizR3ZFnXSGH4aaT4jGKlwK64sNrdqyOxl53PIbsIXEbfinWzKHurnzHmeUyllqMRCl8mflhZENoFU8bba/dJqaePY5AuvzfI5G2ada/P2+Ln/9AbI9KfnVngFcaioOAVByHjhFEBZSZkCYGmZlal5GdPpifkJ8elCmoCKimAqstpZGjAqC9rKSns7q1uLC6to6xsr/Et72pvLu7l1qzypOcZcCd1IJnliXWRdAAA7"
          style="width: 15px"
        />
      </div>
      {{$t('apps.explorer.action.cut')}}
    </Button>
    <Button variant="text" @click="$emit('copy')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhKAAoAMIEAAAAAAAAgAAA/////7KysrKysrKysrKysiH5BAEKAAQALAAAAAAoACgAAAPLCLrcTTDKOZ21NGc1uv/gwGgkwYVoN5YbkKanwlbuG8bALJ32x4s53a8H9AVnv4ByeWkuNMml0umE1mBXIlBGsw17q11WOs0SceIPOfD11riQtkeONcbNIDrqx41KfwKBgoFGTmpkgIOChU1uWmALjo8vDId/WYqZioyWTJiaoJyUeJNzkaOlWH6eH6Chpqtlra6ZonWpN6e3uLZ7n7SDvbmzwIuwVHqPyJW8diyJxYSmSL/RziXJWnAk2WdH3KSp21bN1+DLy9ToyAkAOw=="
          style="width: 20px"
        />
      </div>
      {{$t('apps.explorer.action.copy')}}
    </Button>
    <Button variant="text" @click="$emit('paste')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhJgAkAMIGAAAAAAAA/4CAAMDAwP//AP///7KysrKysiH5BAEKAAcALAAAAAAmACQAAAPqeLoM/tCxSWuL2OqDIfng1z3b6IShCViOIAyDe4IeDcAuLE3tGwsz0SN1++lWvKIMubnggMyF47lrSpVQSu+oGuUG1eu3axpHFVOj+sv2tcNo7HO+dtvhHECbvq8ftXp2fIJ+YGd5g4mFS4CKfY9ZSZBUZCSShG+VeGmThgWfoKGfEE6LPg6iqQWkYph3AKqiqKtIW6azsaOwtHGOp7sBwcKhKr5Hn8LDoCqdS7m5EM1Qz7EQxp4Fydraupyux9nb4rpxmtSqO5q458uHJcDi2+RWV8jx3Lz0ceyy7hrr/PC8UxdBXzmCDxIAADs="
          style="width: 19px"
        />
      </div>
      {{$t('apps.explorer.action.paste')}}
    </Button>
    <!--
    <Divider layout="vertical" />
    <Button variant="text" @click="$emit('undo')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhJAAcAKEDAAAAAMDAwP///7KysiH5BAEKAAMALAAAAAAkABwAAAKWnI+ZwO0K43JU2uOECEFzzVxStnUlCCDh2Hzn665r5Li2GafDM3l4QGn4UDwVYFgKMpAk2fFV7CWFAiezQXtyaqYlVGdh5MRdbVlEJpqvIoN3S72h2jszl02vjwHyKrid5vf2MwdoF0foRzd4B3PG4uPUlxN26KaEOTNBWZeplMWZxxIqOvpYCjmFWhn5tzoR9aoQpFAAADs="
          style="width: 19px"
        />
      </div>
      {{$t('apps.explorer.toolbar.undo')}}
    </Button>
    -->
    <Button variant="text" @click="$emit('delete')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhJAAkAIABAP8AALKysiH5BAEKAAEALAAAAAAkACQAAAJ2hB+py+150JsUxlursVfmtyld9ImeOQIlpzppSJHT28an3YG3NurwyvrJgIscqkYsvpK+HrP5ezaMUgatqkxhA1TuDtgdErtZZIl8BGN40dkaZ3Y5M+LpnB0PfnnQvc2uxSS0JIgUuKXXVoX2FMJYqIToJrlQAAA7"
          style="width: 18px"
        />
      </div>
      {{$t('apps.explorer.action.delete')}}
    </Button>
    <Divider layout="vertical" />
    <Button variant="text" @click="$emit('properties')">
      <div class="p-button-image">
        <img
          class="mx-auto"
          src="data:image/gif;base64,R0lGODlhJAAmAMIFAAAAAAAAgAAA/8DAwP///7KysrKysrKysiH5BAEKAAcALAAAAAAkACYAAAPieLrcCzBKqKS7bWpQI8YQQQyDSJoDJKzCd4VjGaMq6zIQCZ9zzLa3jg6AKvpYm81waOT9kpplithzIqmiLCE3le5ktRVMK+KaAcxeWDDOnsvo7hQaIW/jsPOQ3ob372laFA9YbnVkb4gchHaNio6DHY6Td5CLkpSZdpEHf5qUnG0BowEipKeoo4KXnYWnpqmxqziFn5mhtbaTuFqvBLGyhrS9pLDAvnDDupq8y7esosW/x8h3ysal09SqwozOoNC537Pe2NjU5Jjm2tvpreO74fCW1/PunvO4fPsbtPz/HhYkAAA7"
          style="width: 18px"
        />
      </div>
      {{$t('apps.explorer.action.properties')}}
    </Button>
  </div>
</template>

<style scoped lang="scss">
.p-button {
  text-align: center;
  vertical-align: top;
  min-width: 50px;
  height: 50px;
  margin-bottom: 4px;
  filter: grayscale(1);

  &-image {
    display: grid;
    align-items: center;
    height: 32px;

    img {
      pointer-events: none;
      vertical-align: middle;
    }
  }

  &:disabled {
    opacity: 0.35;
  }

  &:not(:disabled):hover {
    filter: grayscale(0);
  }
}

.p-divider {
  display: inline-flex;
  width: 1px;
}
</style>
