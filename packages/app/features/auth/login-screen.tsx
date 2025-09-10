'use client'

import { Button, Paragraph, YStack } from '@my/ui'
import { TextInput } from 'react-native'
import { useState } from 'react'
import { useAuth } from '../../provider/AuthProvider'

export function LoginScreen() {
  const { signInWithPassword, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setError(null)
    try {
      await signInWithPassword(email.trim(), password)
    } catch (e: any) {
      setError(e.message ?? 'Login failed')
    }
  }

  return (
    <YStack f={1} jc="center" ai="center" gap="$4" p="$4">
      <Paragraph text="center">Sign in</Paragraph>
      <TextInput
        placeholder="email"
        autoCapitalize="none"
        inputMode="email"
        style={{ width: 280, padding: 10, borderWidth: 1, borderRadius: 8 }}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="password"
        secureTextEntry
        style={{ width: 280, padding: 10, borderWidth: 1, borderRadius: 8 }}
        value={password}
        onChangeText={setPassword}
      />
      {error && <Paragraph color="$red10">{error}</Paragraph>}
      <Button disabled={loading} onPress={onSubmit}>
        {loading ? '...' : 'Login'}
      </Button>
    </YStack>
  )
}