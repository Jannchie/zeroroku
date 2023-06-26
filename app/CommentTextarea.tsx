'use client'
import { Textarea, Btn } from 'roku-ui'
import { usePathname } from 'next/navigation'
import { useSendCommentMutation, type CommentData } from '@/data'
import { TablerSend } from '@roku-ui/icons-tabler'
import { useCallback, useState } from 'react'
export function CommentTextarea ({ parentID, onSuccess }: { parentID?: number, onSuccess?: (c: CommentData) => void }) {
  const [inputValue, setInputValue] = useState('')
  const sendCommentMutation = useSendCommentMutation({
    onSuccess: (res) => {
      setInputValue('')
      onSuccess?.(res)
    },
  })
  const pathname = usePathname()
  const onSendCallback = useCallback(() => {
    sendCommentMutation.mutate({
      content: inputValue,
      path: pathname,
      parent_id: parentID,
    })
  }, [inputValue, parentID, pathname, sendCommentMutation])
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
