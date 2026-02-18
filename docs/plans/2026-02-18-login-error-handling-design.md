# Login Screen: Error Handling & Password Visibility Toggle

**Date:** 2026-02-18
**Status:** Approved

## Problem

The mobile login screen lacks inline field validation, has no network error handling for unexpected failures, and offers no way to reveal the password while typing.

## Design

### 1. Input Component — `rightIcon` Prop

Add `rightIcon?: React.ReactNode` to `InputProps`, rendered on the right side of the input row (mirrors existing `leftIcon`). Also add `autoCapitalize` passthrough to `TextInput` (currently passed from login.tsx but silently ignored).

### 2. Password Visibility Toggle

- `showPassword` boolean state in `login.tsx`, defaults to `false`
- `Eye` / `EyeOff` from `lucide-react-native` wrapped in `Pressable` as `rightIcon`
- Toggles `secureTextEntry` on the password Input

### 3. Inline Field Validation

- `hasAttemptedSubmit` boolean state — errors only appear after first submit attempt
- Empty username: `"Username is required"` via Input's `error` prop
- Empty password: `"Password is required"` via Input's `error` prop
- Server errors (Invalid credentials, Account deactivated, etc.) remain as Toast messages since they don't map to a single field

### 4. Network Error Handling

- Wrap `signIn()` in try/catch inside `handleSignIn`
- On unexpected exception: Toast with `"Something went wrong. Please check your connection and try again."`
- Existing `finally` block already resets `isSubmitting`

## Files Modified

| File | Change |
|------|--------|
| `mobile/src/components/ui/Input.tsx` | Add `rightIcon` prop, `autoCapitalize` passthrough |
| `mobile/src/components/ui/Input.test.tsx` | Add rightIcon rendering test |
| `mobile/src/app/(auth)/login.tsx` | `showPassword` toggle, inline validation, try/catch |
| `mobile/src/__tests__/screens/(auth)/login.test.tsx` | Tests for validation, toggle, network error |
