<script setup lang="ts">
/*
 * Telegram's official Login Widget (https://core.telegram.org/widgets/login). Telegram shows its own
 * button and asks the person to confirm; the signed result comes back to `auth`. It also asks to let
 * the bot message them, which is how new-episode alerts reach them. The bot's domain must be set
 * with @BotFather (/setdomain), so it doesn't work on localhost.
 */
const emit = defineEmits<{ auth: [data: Record<string, unknown>] }>()
const bot = useRuntimeConfig().public.telegramBot as string
const box = ref<HTMLElement>()
const callback = `__rfTelegramAuth${Math.random().toString(36).slice(2)}`

onMounted(() => {
  if (!bot || !box.value) return
  ;(window as unknown as Record<string, unknown>)[callback] = (user: Record<string, unknown>) => emit('auth', user)
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.dataset.telegramLogin = bot
  script.dataset.size = 'large'
  script.dataset.radius = '10'
  script.dataset.requestAccess = 'write'
  script.dataset.userpic = 'false'
  script.dataset.onauth = `${callback}(user)`
  box.value.appendChild(script)
})

onBeforeUnmount(() => {
  delete (window as unknown as Record<string, unknown>)[callback]
})
</script>

<template>
  <div ref="box" class="telegram-login" />
</template>

<style scoped>
.telegram-login {
  display: flex;
  justify-content: center;
  min-height: 40px;
}
</style>
