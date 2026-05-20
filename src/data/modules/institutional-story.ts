import type { LearningModule } from './index'

export const institutionalStory: LearningModule = {
  id: 'institutional-story',
  title: 'The Institutional Story',
  description: 'How the US government went from taking this seriously to officially dismissing it — and then quietly starting over.',
  color: '#1e40af',
  stations: [
    { id: 1, title: 'Project Sign', eventSlugs: ['project-sign'], reflectionQuestion: "The military's first investigators thought it was real. What does it mean that the conclusion was buried before anyone outside could evaluate it?" },
    { id: 2, title: 'The Estimate of the Situation', eventSlugs: ['estimate-of-the-situation'], reflectionQuestion: "A classified document reached a conclusion, was rejected by one man, and ordered destroyed. How many other conclusions have disappeared the same way?" },
    { id: 3, title: 'From Investigation to Management', eventSlugs: ['project-grudge', 'project-blue-book'], reflectionQuestion: "At what point does an investigation become a management operation? What's the difference — and does it matter?" },
    { id: 4, title: 'The Robertson Panel', eventSlugs: ['robertson-panel'], reflectionQuestion: "The government decided the public couldn't be trusted with this information. Do you think that decision was about national security — or something else?" },
    { id: 5, title: 'Science as Cover', eventSlugs: ['condon-committee'], reflectionQuestion: "The Low Memo was written before a single case was investigated. When you learned that, what changed in how you think about official scientific conclusions generally?" },
    { id: 6, title: 'The Gap Begins', eventSlugs: ['project-blue-book-closure'], reflectionQuestion: "38 years passed between Blue Book closing and AATIP being revealed. What do you think happened in those 38 years?" },
    { id: 7, title: 'AATIP in the Shadows', eventSlugs: ['nyt-aatip-story'], reflectionQuestion: "Harry Reid funded a secret UAP program using a classified defense earmark. He did it because he believed the phenomenon was real. What does it mean that a Senate Majority Leader thought this was worth doing quietly?" },
    { id: 8, title: 'The Circle Completes', eventSlugs: ['uap-task-force', 'aaro-established'], reflectionQuestion: "The institution came full circle — from Project Sign to AARO, the same basic question, 75 years later. Why do you think it took this long?" },
  ],
  completion: {
    type: 'book',
    title: 'UFOs and Government: A Historical Inquiry',
    author: 'Michael Swords and Robert Powell',
    description: 'The most rigorous academic history of US government UAP investigation ever written. If the Institutional Story felt like an overview, this is the full record — 600 pages of primary source research by a team of historians. It will permanently change how you read official government statements on any subject.',
  },
}
