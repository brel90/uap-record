import type { LearningModule } from './index'

export const suppressionRecord: LearningModule = {
  id: 'suppression-record',
  title: 'The Suppression Record',
  description: "Why you didn't know about this. Why you may have called others crazy for believing it. Why that was deliberate.",
  color: '#dc2626',
  stations: [
    { id: 1, title: 'Silence by Regulation', eventSlugs: ['usaf-regulation-200-2'], reflectionQuestion: "Military pilots were legally required to stay silent about what they saw. How many encounters do you think never made it into any record at all?" },
    { id: 2, title: 'Monitoring Citizens', eventSlugs: ['robertson-panel-surveillance-mandate'], reflectionQuestion: "The government monitored citizens for being interested in this topic. Does knowing that change how you think about your own previous skepticism?" },
    { id: 3, title: 'The Ridicule Policy', eventSlugs: ['hynek-ridicule-policy'], reflectionQuestion: "Hynek spent 20 years publicly dismissing cases he privately found credible. What does it take for someone to do that — and what does it take to stop?" },
    { id: 4, title: 'Dismantling Civilian Research', eventSlugs: ['nicap-infiltration'], reflectionQuestion: "The most credible civilian research organization collapsed under suspicious circumstances at exactly the moment the government closed its official investigation. Do you think that was coincidence?" },
    { id: 5, title: 'The NDA Framework', eventSlugs: ['nda-security-oath-framework'], reflectionQuestion: "Witnesses describe being told they never saw what they saw. What would it take for you to stay silent about something you knew was real?" },
    { id: 6, title: 'The Cost of Speaking', eventSlugs: ['witness-retaliation-pattern'], reflectionQuestion: "Careers ended. People were reassigned, ridiculed, threatened. Knowing this — how do you think about the witnesses who spoke anyway?" },
    { id: 7, title: "Even Senators Couldn't Know", eventSlugs: ['congressional-uap-access-denial'], reflectionQuestion: "A former Air Force general and sitting US Senator was told by the Air Force Chief of Staff that he couldn't see certain files. If elected officials with security clearances can't access this — who can?" },
    { id: 8, title: 'The Pattern Continues', eventSlugs: ['aaro-access-complaints'], reflectionQuestion: "The office created specifically to receive disclosures may itself be unable to access what it's supposed to investigate. At what point does a disclosure mechanism become another layer of concealment?" },
    { id: 9, title: 'Active Obstruction — The CIA Seizes Files (2026)', eventSlugs: ['cia-uap-obstruction-2026'], reflectionQuestion: "A current CIA officer testified that the agency surveilled federal UAP investigators and seized 40 boxes of files from the DNI's declassification office. This isn't history — it happened this month. Does knowing the suppression is still active change how you think about everything else you just read?" },
  ],
  completion: {
    type: 'podcast',
    title: 'Need to Know',
    author: 'Ross Coulthart and Bryce Zabel',
    description: "Two veteran investigative journalists covering the suppression and disclosure story in real time. Coulthart broke the Grusch story publicly on NewsNation. This podcast connects what you just read to what's happening right now — the suppression mechanisms are still active, and so is the pushback against them.",
  },
}
