import { atom } from 'jotai'

// Example counter atom
export const countAtom = atom(0)

// Example user atom
export const userAtom = atom({
  name: 'Guest',
  email: '',
})

// Example derived atom (computed from other atoms)
export const doubleCountAtom = atom((get) => get(countAtom) * 2)

