'use client'
import { Textarea, Btn } from 'roku-ui'
import { usePathname } from 'next/navigation'
import { useSendCommentMutation } from '@/data'
import { TablerSend } from '@roku-ui/icons-tabler'
import { useCallback, useState } from 'react'

export function CommentTextarea () {
  const [inputValue, setInputValue] = useState('')
  const sendCommentMutation = useSendCommentMutation()
  const pathname = usePathname()
  const onSendCallback = useCallback(() => {
    sendCommentMutation.mutate({
      content: inputValue,
      path: pathname,
    })
    setInputValue('')
  }, [inputValue, pathname, sendCommentMutation])
  return (
    <div className="flex gap-1">
      <Textarea
        className="flex-grow"
        placeholder="写下你的观测记录..."
        maxHeight={16 + 20 * 3}
        value={inputValue}
        setValue={setInputValue}
        onKeyDown={(e) => {
          // ctl + enter
          if (e.ctrlKey && e.key === 'Enter') {
            onSendCallback()
          }
        }}
      />
      <Btn
        icon
        disabled={inputValue.length === 0}
        onClick={onSendCallback}
      >
        <TablerSend />
      </Btn>
    </div>
  )
}
