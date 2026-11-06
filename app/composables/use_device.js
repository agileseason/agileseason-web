export const useDevice = () => {
  const width = ref(0);
  const isMobile = computed(() => width.value < 1024);

  const updateWidth = () => {
    width.value = window.innerWidth;
  };

  onMounted(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth);
  });

  return {
    width,
    isMobile,
  };
};

