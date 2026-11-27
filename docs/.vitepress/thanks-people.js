// Human contributors from the repository's GitHub Contributors page. Exclude bot and agent accounts.
const toMember = ([login, avatarPath]) => ({
    name: `@${login}`,
    avatar: `https://avatars.githubusercontent.com/${avatarPath}?s=96&v=4`,
    profile: `https://github.com/${login}`
});

export const contributors = [
    ['cenfun', 'u/334577'],
    ['netconomy-stephan-dum', 'u/61015558'],
    ['mrazauskas', 'u/72159681'],
    ['nphmuller', 'u/3781551'],
    ['papandreou', 'u/373545']
].map(toMember);

export const specialThanks = [
    ['bcoe', 'u/194609'],
    ['edumserrano', 'u/15857357'],
    ['jakebailey', 'u/5341706']
].map(toMember);
