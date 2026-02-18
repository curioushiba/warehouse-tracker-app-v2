# Login Error Handling & Password Toggle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add inline field validation, network error handling, and password visibility toggle to the mobile login screen.

**Architecture:** Extend the shared Input component with `rightIcon` and `autoCapitalize` props, then use them in the login screen. Login gets `showPassword` state with Eye/EyeOff icons, `hasAttemptedSubmit` for inline validation, and try/catch for network errors.

**Tech Stack:** React Native, lucide-react-native (Eye/EyeOff), jest-expo, @testing-library/react-native

---

### Task 1: Input Component — Add `rightIcon` and `autoCapitalize`

**Files:**
- Modify: `mobile/src/components/ui/Input.tsx`
- Modify: `mobile/src/components/ui/Input.test.tsx`

**Step 1: Write failing tests for `rightIcon` and `autoCapitalize`**

Add two tests to the end of `Input.test.tsx`:

```tsx
it('renders right icon', () => {
  const icon = <Text testID="right-icon">icon</Text>
  const { getByTestId } = render(
    <Input
      placeholder="Password"
      onChangeText={() => {}}
      value=""
      rightIcon={icon}
      testID="input"
    />
  )
  expect(getByTestId('right-icon')).toBeTruthy()
})

it('passes autoCapitalize to TextInput', () => {
  const { getByTestId } = render(
    <Input
      placeholder="Username"
      onChangeText={() => {}}
      value=""
      autoCapitalize="none"
      testID="input"
    />
  )
  expect(getByTestId('input').props.autoCapitalize).toBe('none')
})
```

**Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest --no-coverage src/components/ui/Input.test.tsx`
Expected: 2 failures — `rightIcon` and `autoCapitalize` are not recognized props

**Step 3: Implement `rightIcon` and `autoCapitalize` in Input.tsx**

In `InputProps` interface, add:
```ts
rightIcon?: React.ReactNode
autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
```

In the destructured params, add `rightIcon` and `autoCapitalize`.

In the JSX, add after the `<TextInput>` closing tag, before `</View>` (the inputRow):
```tsx
{rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
```

Add `autoCapitalize={autoCapitalize}` to the `<TextInput>`.

Add to styles:
```ts
rightIconContainer: {
  marginLeft: 8,
},
```

**Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --no-coverage src/components/ui/Input.test.tsx`
Expected: All 9 tests pass

**Step 5: Commit**

```bash
git add mobile/src/components/ui/Input.tsx mobile/src/components/ui/Input.test.tsx
git commit -m "feat(mobile): add rightIcon and autoCapitalize props to Input component"
```

---

### Task 2: Login Screen — Password Visibility Toggle

**Files:**
- Modify: `mobile/src/__tests__/screens/(auth)/login.test.tsx`
- Modify: `mobile/src/app/(auth)/login.tsx`

**Step 1: Write failing tests for password toggle**

Add a `jest.mock` for `lucide-react-native` is NOT needed — it's already mocked globally in `src/test/setup-jest.ts` via a Proxy. The mock renders each icon as `<Text testID="icon-{IconName}">`.

Add these tests inside the existing `describe('LoginScreen')`:

```tsx
it('renders password toggle icon', () => {
  const { getByTestId } = render(<LoginScreen />)
  expect(getByTestId('password-toggle')).toBeTruthy()
})

it('toggles password visibility when eye icon pressed', () => {
  const { getByTestId } = render(<LoginScreen />)
  const passwordInput = getByTestId('password-input')

  // Initially password is hidden
  expect(passwordInput.props.secureTextEntry).toBe(true)

  // Press the toggle
  fireEvent.press(getByTestId('password-toggle'))

  // Password should now be visible
  expect(getByTestId('password-input').props.secureTextEntry).toBe(false)
})
```

**Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: 2 failures — `password-toggle` testID not found

**Step 3: Implement password toggle in login.tsx**

Add imports:
```tsx
import { Pressable } from 'react-native'  // add to existing RN import
import { Eye, EyeOff } from 'lucide-react-native'
```

Add state:
```tsx
const [showPassword, setShowPassword] = useState(false)
```

Replace the password `<Input>` with:
```tsx
<Input
  placeholder="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={!showPassword}
  rightIcon={
    <Pressable
      onPress={() => setShowPassword(prev => !prev)}
      testID="password-toggle"
    >
      {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
    </Pressable>
  }
  testID="password-input"
/>
```

**Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: All 10 tests pass

**Step 5: Commit**

```bash
git add mobile/src/app/\(auth\)/login.tsx mobile/src/__tests__/screens/\(auth\)/login.test.tsx
git commit -m "feat(mobile): add password visibility toggle to login screen"
```

---

### Task 3: Login Screen — Inline Field Validation

**Files:**
- Modify: `mobile/src/__tests__/screens/(auth)/login.test.tsx`
- Modify: `mobile/src/app/(auth)/login.tsx`

**Step 1: Write failing tests for inline validation**

Add these tests inside `describe('LoginScreen')`:

```tsx
it('shows username required error on submit with empty username', async () => {
  const { getByTestId, queryByTestId } = render(<LoginScreen />)

  // No error initially
  expect(queryByTestId('username-input-error')).toBeNull()

  // Fill password only, leave username empty
  fireEvent.changeText(getByTestId('password-input'), 'password123')
  fireEvent.press(getByTestId('sign-in-button'))

  await waitFor(() => {
    expect(getByTestId('username-input-error')).toBeTruthy()
  })
})

it('shows password required error on submit with empty password', async () => {
  const { getByTestId, queryByTestId } = render(<LoginScreen />)

  expect(queryByTestId('password-input-error')).toBeNull()

  fireEvent.changeText(getByTestId('username-input'), 'testuser')
  fireEvent.press(getByTestId('sign-in-button'))

  await waitFor(() => {
    expect(getByTestId('password-input-error')).toBeTruthy()
  })
})

it('shows both field errors on submit with both fields empty', async () => {
  const { getByTestId } = render(<LoginScreen />)

  fireEvent.press(getByTestId('sign-in-button'))

  await waitFor(() => {
    expect(getByTestId('username-input-error')).toBeTruthy()
    expect(getByTestId('password-input-error')).toBeTruthy()
  })
})

it('does not show field errors before first submit attempt', () => {
  const { queryByTestId } = render(<LoginScreen />)
  expect(queryByTestId('username-input-error')).toBeNull()
  expect(queryByTestId('password-input-error')).toBeNull()
})
```

**Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: 3 failures (the 3 "shows...error" tests fail; the "does not show" test passes already)

**Step 3: Implement inline validation in login.tsx**

Add state:
```tsx
const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
```

Compute error strings (after state declarations, before `handleSignIn`):
```tsx
const usernameError = hasAttemptedSubmit && username.trim().length === 0 ? 'Username is required' : undefined
const passwordError = hasAttemptedSubmit && password.trim().length === 0 ? 'Password is required' : undefined
```

Update `handleSignIn` — replace the early return guard and add `setHasAttemptedSubmit(true)`:
```tsx
const handleSignIn = useCallback(async () => {
  setHasAttemptedSubmit(true)
  if (!isFormValid || isSubmitting) return

  setIsSubmitting(true)
  try {
    const result = await signIn(username.trim(), password)
    if (result.error) {
      Toast.show({
        type: 'error',
        text1: result.error,
      })
    } else {
      router.replace('/domain-picker')
    }
  } finally {
    setIsSubmitting(false)
  }
}, [username, password, isFormValid, isSubmitting, signIn, router])
```

Add `error` prop to both Input components:
```tsx
<Input
  placeholder="Username"
  value={username}
  onChangeText={setUsername}
  autoCapitalize="none"
  error={usernameError}
  testID="username-input"
/>
```
```tsx
<Input
  placeholder="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={!showPassword}
  error={passwordError}
  rightIcon={...}
  testID="password-input"
/>
```

**Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: All 14 tests pass

**Step 5: Commit**

```bash
git add mobile/src/app/\(auth\)/login.tsx mobile/src/__tests__/screens/\(auth\)/login.test.tsx
git commit -m "feat(mobile): add inline field validation to login screen"
```

---

### Task 4: Login Screen — Network Error Handling

**Files:**
- Modify: `mobile/src/__tests__/screens/(auth)/login.test.tsx`
- Modify: `mobile/src/app/(auth)/login.tsx`

**Step 1: Write failing test for network error**

Add this test inside `describe('LoginScreen')`:

```tsx
it('shows toast on unexpected network error', async () => {
  mockSignIn.mockRejectedValue(new Error('Network request failed'))
  const { getByTestId } = render(<LoginScreen />)

  fireEvent.changeText(getByTestId('username-input'), 'testuser')
  fireEvent.changeText(getByTestId('password-input'), 'password123')
  fireEvent.press(getByTestId('sign-in-button'))

  await waitFor(() => {
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Something went wrong. Please check your connection and try again.',
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: 1 new failure — unhandled rejection, no Toast shown for thrown error

**Step 3: Add try/catch for network errors in login.tsx**

Update the `handleSignIn` try block to add a `catch`:
```tsx
const handleSignIn = useCallback(async () => {
  setHasAttemptedSubmit(true)
  if (!isFormValid || isSubmitting) return

  setIsSubmitting(true)
  try {
    const result = await signIn(username.trim(), password)
    if (result.error) {
      Toast.show({
        type: 'error',
        text1: result.error,
      })
    } else {
      router.replace('/domain-picker')
    }
  } catch {
    Toast.show({
      type: 'error',
      text1: 'Something went wrong. Please check your connection and try again.',
    })
  } finally {
    setIsSubmitting(false)
  }
}, [username, password, isFormValid, isSubmitting, signIn, router])
```

**Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest --no-coverage "src/__tests__/screens/\\(auth\\)/login.test"`
Expected: All 15 tests pass

**Step 5: Run full test suites**

Run: `cd mobile && npx vitest run` — Expected: 570 tests pass
Run: `cd mobile && npx jest --no-coverage` — Expected: 265+ tests pass (264 existing + new)
Run: `cd mobile && npx tsc --noEmit` — Expected: only pre-existing errors in unrelated files

**Step 6: Commit**

```bash
git add mobile/src/app/\(auth\)/login.tsx mobile/src/__tests__/screens/\(auth\)/login.test.tsx
git commit -m "feat(mobile): add network error handling to login screen"
```
