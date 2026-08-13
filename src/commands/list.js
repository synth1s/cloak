import { listProfileNames, getActiveProfile, getAccountEmail } from '../lib/paths.js'
import { getProfileProvider } from '../lib/providers.js'
import * as msg from '../lib/messages.js'

export function listAccounts() {
  const names = listProfileNames().sort()
  const active = getActiveProfile()

  const accounts = names.map(name => {
    const email = getAccountEmail(name)
    const provider = email ? null : (getProfileProvider(name)?.label || null)
    return {
      name,
      active: name === active,
      email,
      provider,
    }
  })

  if (accounts.length === 0) {
    console.log(msg.noCloaksYet())
    console.log(msg.suggestCreate())
    return accounts
  }

  console.log(msg.accountListHeader())
  accounts.forEach(({ name, active: isActive, email, provider }) => {
    console.log(msg.accountListItem(name, isActive, email, provider))
  })
  console.log()

  return accounts
}
