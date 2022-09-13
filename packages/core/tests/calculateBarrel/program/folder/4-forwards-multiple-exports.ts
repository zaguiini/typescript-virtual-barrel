export const VariableMember = true

const Member1 = true
const Member2 = true

export { Member1, Member2 as AliasedMember2 }

// eslint-disable-next-line @typescript-eslint/no-empty-function
export default function DefaultFunction() {}
