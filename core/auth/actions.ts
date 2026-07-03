"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { resolveAppOriginFromHeaders } from "@/core/auth/origin"
import { getCoreAuthBrand } from "@/core/auth/brand"
import { classifyAuthError } from "@/core/auth/errors"
import { createClient } from "@/core/supabase/server"

const MIN_PASSWORD_LENGTH = 8

function readTrimmedString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function readPassword(formData: FormData, key: string): string {
  const value = formData.get(key)
  // Passwords are not trimmed: leading/trailing characters are legitimate.
  return typeof value === "string" ? value : ""
}

export async function signInWithPassword(formData: FormData): Promise<never> {
  const email = readTrimmedString(formData, "email").toLowerCase()
  const password = readPassword(formData, "password")

  if (!email) {
    redirect("/sign-in?error=missing-email")
  }

  if (!password) {
    redirect("/sign-in?error=missing-password")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const errorCode = classifyAuthError(error)
    console.warn("Supabase password sign-in failed", {
      status: error.status,
      code: error.code,
      name: error.name,
      bucket: errorCode,
    })
    // "email-not-confirmed" is only ever distinguishable from "wrong
    // password" for accounts that exist — surfacing it separately would let
    // an attacker enumerate registered emails. Collapse it into the generic
    // credentials message here.
    redirect(`/sign-in?error=${errorCode === "email-not-confirmed" ? "invalid-credentials" : errorCode}`)
  }

  redirect("/home")
}

export async function signUpWithPassword(formData: FormData): Promise<never> {
  const email = readTrimmedString(formData, "email").toLowerCase()
  const displayName = readTrimmedString(formData, "displayName")
  const password = readPassword(formData, "password")
  const confirmPassword = readPassword(formData, "confirmPassword")

  if (!email) {
    redirect("/sign-up?error=missing-email")
  }

  if (!password) {
    redirect("/sign-up?error=missing-password")
  }

  if (password !== confirmPassword) {
    redirect("/sign-up?error=password-mismatch")
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect("/sign-up?error=weak-password")
  }

  const headerStore = await headers()
  const origin = resolveAppOriginFromHeaders(headerStore)
  const authBrand = await getCoreAuthBrand()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        ...(displayName ? { display_name: displayName.slice(0, 120) } : {}),
        brand_name: authBrand.name,
      },
    },
  })

  if (error) {
    const errorCode = classifyAuthError(error)
    console.warn("Supabase password sign-up failed", {
      status: error.status,
      code: error.code,
      name: error.name,
      bucket: errorCode,
    })
    redirect(`/sign-up?error=${errorCode}`)
  }

  // Confirmations disabled: Supabase returns a live session — go straight in.
  if (data.session) {
    redirect("/home")
  }

  // Confirmations enabled: always show the same "check your email" state.
  // Supabase intentionally returns an obfuscated user for existing emails, and
  // we don't distinguish — that would allow account enumeration.
  redirect("/sign-up?sent=1")
}

export async function requestPasswordReset(formData: FormData): Promise<never> {
  const email = readTrimmedString(formData, "email").toLowerCase()

  if (!email) {
    redirect("/forgot-password?error=missing-email")
  }

  const headerStore = await headers()
  const origin = resolveAppOriginFromHeaders(headerStore)
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/set-password`,
  })

  if (error) {
    const errorCode = classifyAuthError(error)
    console.warn("Supabase password reset request failed", {
      status: error.status,
      code: error.code,
      name: error.name,
      bucket: errorCode,
    })

    // Only surface delivery problems. Anything else still shows the neutral
    // "check your email" state so the form can't be used to probe accounts.
    if (errorCode === "rate-limited" || errorCode === "email-provider") {
      redirect(`/forgot-password?error=${errorCode}`)
    }
  }

  redirect("/forgot-password?sent=1")
}

export async function updatePassword(formData: FormData): Promise<never> {
  const password = readPassword(formData, "password")
  const confirmPassword = readPassword(formData, "confirmPassword")

  if (!password) {
    redirect("/set-password?error=missing-password")
  }

  if (password !== confirmPassword) {
    redirect("/set-password?error=password-mismatch")
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect("/set-password?error=weak-password")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in?error=session-expired")
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const errorCode = classifyAuthError(error)
    console.warn("Supabase password update failed", {
      status: error.status,
      code: error.code,
      name: error.name,
      bucket: errorCode,
    })
    redirect(`/set-password?error=${errorCode}`)
  }

  redirect("/home")
}
