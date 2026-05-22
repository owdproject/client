export const useTheme = () => {
  const currentTheme = ref<'dark' | 'light'>('dark')

  const setTheme = (theme: 'dark' | 'light') => {
    currentTheme.value = theme
  }

  return {
    currentTheme,
    setTheme,
  }
}
