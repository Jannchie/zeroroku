'use client'
import { useState } from 'react'
import { Btn, Panel, Tabs, TextField } from 'roku-ui'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useLoginMutation, useSignInMutation } from '@/data'

function Login ({
  account, setAccount, password, setPassword,
}: any) {
  const loginMutation = useLoginMutation()
  const [hcaptcha, setHcaptcha] = useState('')
  return (
    <div className="flex flex-col gap-2 items-center p-10">
      <div className="font-black text-2xl">ZEROROKU</div>
      <div className="text-sm mb-2 text-blue-500">研究员入口</div>

      <TextField
        value={account}
        className="w-[302px]"
        placeholder="用户名"
        autoComplete="username"
        onChange={(e) => setAccount(e.target.value)}
      />
      <TextField
        value={password}
        className="w-[302px]"
        placeholder="口令"
        type="password"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <HCaptcha
        sitekey={process.env.NODE_ENV === 'development'
          ? '10000000-ffff-ffff-ffff-000000000001'
          : 'a758c0fc-832c-442b-a828-f95fa42d25eb'}
        onVerify={(token) => {
          setHcaptcha(token)
        }}
      />
      <Btn
        className="j-btn w-80"
        style={{ width: '302px' }}
        disabled={hcaptcha === ''}
        onClick={() => {
          loginMutation.mutate({ account, password, hcaptcha })
        }}
      >
        登录
      </Btn>
      <div className="text-sm text-gray-500/80">目前接纳新成员。</div>
    </div>
  )
};

const Sign = ({
  account, setAccount, password, setPassword,
}: any) => {
  const [password2, setPassword2] = useState('')
  const [mail, setMail] = useState('')
  const [hcaptcha, setHcaptcha] = useState('')
  const signInMutation = useSignInMutation()
  return (
    <div className="flex flex-col gap-2 items-center p-10">
      <div className="font-black text-2xl">ZEROROKU</div>
      <div className="text-sm mb-2 text-blue-500">研究员注册</div>
      <TextField
        value={mail}
        className="w-[302px]"
        placeholder="邮箱"
        autoComplete="mail"
        onChange={(e) => { setMail(e.target.value) }}
      />
      <TextField
        value={account}
        className="w-[302px]"
        placeholder="用户名"
        autoComplete="username"
        onChange={(e) => setAccount(e.target.value)}
      />
      <TextField
        value={password}
        className="w-[302px]"
        placeholder="口令"
        type="password"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        value={password2}
        className="w-[302px]"
        placeholder="请再输入一次口令"
        type="password"
        onChange={(e) => { setPassword2(e.target.value) }}
      />
      <HCaptcha
        sitekey={process.env.NODE_ENV === 'development'
          ? '10000000-ffff-ffff-ffff-000000000001'
          : 'a758c0fc-832c-442b-a828-f95fa42d25eb'}
        onVerify={(token) => {
          setHcaptcha(token)
        }}
      />
      <Btn
        style={{ width: '302px' }}
        disabled={hcaptcha === '' || password !== password2}
        onClick={() => {
          signInMutation.mutate({
            username: account,
            password,
            mail,
            hcaptcha,
          })
        }}
      >
        注册
      </Btn>
      <div className="text-sm text-gray-500/80">目前接纳新成员。</div>
    </div>
  )
}

export default function Home () {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [page, setPage] = useState(0)
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="flex justify-center">
          <Panel
            border
            className="border p-2 md:basis-5/12 basis-full text-center"
          >
            <Tabs
              color="primary"
              selectedIndex={page}
              onChange={((index: number) => {
                setPage(index)
              }) as any}
            >
              <Tabs.Item label="登录">
                <Login
                  account={account}
                  setAccount={setAccount}
                  password={password}
                  setPassword={setPassword}
                />
              </Tabs.Item>
              <Tabs.Item label="注册">
                <Sign
                  account={account}
                  setAccount={setAccount}
                  password={password}
                  setPassword={setPassword}
                />
              </Tabs.Item>
            </Tabs>
          </Panel>
        </div>
      </form>
    </>
  )
}
