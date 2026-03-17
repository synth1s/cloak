import { getActiveProfile } from '../lib/paths.js'
import * as msg from '../lib/messages.js'

export function whoami() {
  const active = getActiveProfile()
  if (!active) {
    // stderr for info messages, so piping `cloak whoami` gives clean output
    console.error(msg.noCloak())
    return null
  }
  console.log(active)
  return active
}
