import { getActiveProfile, readProfileEnv, writeProfileEnv } from '../lib/paths.js'
import * as msg from '../lib/messages.js'

export async function envSet(assignment) {
  const name = getActiveProfile()
  if (!name) {
    console.error(msg.noActiveCloakForEnv())
    process.exit(1)
    return
  }

  const eqIndex = assignment.indexOf('=')
  if (eqIndex === -1) {
    console.error(msg.envInvalidFormat(assignment))
    process.exit(1)
    return
  }

  const key = assignment.slice(0, eqIndex)
  const value = assignment.slice(eqIndex + 1)

  if (!key) {
    console.error(msg.envEmptyKey())
    process.exit(1)
    return
  }

  const vars = readProfileEnv(name)
  vars[key] = value
  writeProfileEnv(name, vars)
  console.log(msg.envVarSet(key))
}

export async function envUnset(key) {
  const name = getActiveProfile()
  if (!name) {
    console.error(msg.noActiveCloakForEnv())
    process.exit(1)
    return
  }

  const vars = readProfileEnv(name)
  delete vars[key]
  writeProfileEnv(name, vars)
  console.log(msg.envVarUnset(key))
}

export async function envList() {
  const name = getActiveProfile()
  if (!name) {
    console.error(msg.noActiveCloakForEnv())
    process.exit(1)
    return
  }

  const vars = readProfileEnv(name)
  const entries = Object.entries(vars)

  process.stdout.write(msg.envListHeader(name) + '\n')
  if (entries.length === 0) {
    process.stdout.write(msg.envListEmpty() + '\n')
  } else {
    for (const [key, value] of entries) {
      process.stdout.write(msg.envListItem(key, value) + '\n')
    }
  }
  process.stdout.write('\n')
}
