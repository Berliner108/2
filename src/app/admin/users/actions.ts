'use server'

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function updateRole(formData: FormData) {
  const userId = String(formData.get('userId') || '')
  const role = String(formData.get('role') || 'user')

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/users')

  const whitelist = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!whitelist.includes(myEmail)) redirect('/')

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  // sich selbst nicht demoten
  if (userId === user.id && role !== 'admin') {
    redirect(`/admin/users?error=${encodeURIComponent('Du kannst deine eigene Admin-Rolle nicht entfernen.')}`)
  }

  const admin = supabaseAdmin()
  const { data: target } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()

  // anderen Admin nicht umstufen
  if (target?.role === 'admin' && userId !== user.id) {
    redirect(`/admin/users?error=${encodeURIComponent('Andere Admins können nicht umgestuft werden.')}`)
  }
  // niemand anderem Admin geben
  if (role === 'admin' && userId !== user.id) {
    redirect(`/admin/users?error=${encodeURIComponent('Admin-Rechte dürfen nicht an andere vergeben werden.')}`)
  }

  await admin.from('profiles').update({ role }).eq('id', userId)
  redirect(`/admin/users?notice=role&r=${encodeURIComponent(role)}`)
}

export async function toggleBan(formData: FormData) {
  const userId = String(formData.get('userId') || '')
  const action = String(formData.get('action') || 'ban')    // 'ban' | 'unban'
  const rawDur = String(formData.get('duration') || '24h')  // z. B. '24h'

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/users')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) redirect('/')

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  const ALLOWED = new Set(['2h','24h','168h','720h','8760h','87600h'])
  const duration = action === 'unban' ? 'none' : (ALLOWED.has(rawDur) ? rawDur : '24h')

  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: duration } as any)
  if (error) redirect(`/admin/users?error=${encodeURIComponent(error.message)}`)

  redirect(`/admin/users?notice=${action === 'unban' ? 'unbanned' : 'banned'}`)
}

export async function deleteUser(formData: FormData) {
  const targetId = String(formData.get('userId') || '')

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/users')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) redirect('/')

  if (!targetId) redirect(`/admin/users?error=${encodeURIComponent('Missing userId')}`)
  if (targetId === user.id) {
    redirect(`/admin/users?error=${encodeURIComponent('Du kannst dich nicht selbst löschen.')}`)
  }

  const admin = supabaseAdmin()
  const { data: targetProf } = await admin.from('profiles').select('role').eq('id', targetId).maybeSingle()
  if (targetProf?.role === 'admin') {
    redirect(`/admin/users?error=${encodeURIComponent('Admins können nicht gelöscht werden.')}`)
  }

  const { error: delAuthErr } = await admin.auth.admin.deleteUser(targetId)
  if (delAuthErr) redirect(`/admin/users?error=${encodeURIComponent(delAuthErr.message)}`)

  await admin.from('profiles').delete().eq('id', targetId)
  redirect('/admin/users?notice=deleted')
}
