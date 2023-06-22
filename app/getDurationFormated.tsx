'use client'

export function getDurationFormated (milliseconds = 0) {
  milliseconds = Math.abs(milliseconds)
  let seconds = Math.floor(milliseconds / 1000)
  let minutes = Math.floor(seconds / 60)
  seconds %= 60
  let hours = Math.floor(minutes / 60)
  minutes %= 60
  const days = Math.floor(hours / 24)
  hours %= 24
  let result = ''
  if (days) result += `${days}天`
  else if (hours) result += `${hours}小时`
  else if (minutes) result += `${minutes}分`
  else if (seconds) result += `${seconds}秒`
  else return '刚刚'
  return result + '前'
}
