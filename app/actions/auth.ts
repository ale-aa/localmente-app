"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema validazione signup
const signupSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve essere di almeno 8 caratteri"),
  fullName: z.string().min(2, "Il nome completo è obbligatorio"),
});

// Schema validazione login
const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Valida i dati
  const validatedFields = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName } = validatedFields.data;

  // Crea l'utente
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return {
      error: { general: authError.message },
    };
  }

  if (!authData.user) {
    return {
      error: { general: "Errore durante la creazione dell'account" },
    };
  }

  // Dopo il signup, redirect alla pagina di onboarding per creare l'agenzia
  redirect("/onboarding");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Valida i dati
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  // Login
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: { general: "Email o password non corretti" },
    };
  }

  // Verifica se l'utente ha già un'agenzia
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", currentUser.id)
    .maybeSingle(); // Usa maybeSingle invece di single per evitare errori se non esiste

  console.log("Login - Profile check:", { profile, profileError });

  // Se non ha un profilo o non ha agency_id, redirect a onboarding
  if (!profile || !profile.agency_id) {
    redirect("/onboarding");
  }

  // Altrimenti vai alla dashboard
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

// Funzione helper per verificare se l'utente è autenticato
export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Funzione helper per ottenere il profilo completo
export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      agency:agencies(*)
    `)
    .eq("id", user.id)
    .single();

  return profile;
}
