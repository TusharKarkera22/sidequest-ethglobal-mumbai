import { createTask } from './task-domain';
import { demoIdentity } from './session';
import type { Category, Task } from './types';
export function exampleTasks(sessionId: string, now = Date.now()): Task[] {
  const examples: {title:string; description:string; category:Category; skills:string[]; bounty:number; name:string; hours:number}[] = [
    {title:'Make wallet onboarding feel effortless',description:'We have the core flow working. Help us connect a browser wallet, handle rejected signatures gracefully, and make the network switch clear. A good first contribution for someone comfortable with React.',category:'Development',skills:['React','Viem','Wallets'],bounty:75,name:'Aarav',hours:8},
    {title:'Design a calmer transaction receipt',description:'Turn a dense transaction result into a useful confirmation screen. We need clear hierarchy, an explorer link, and friendly states for pending and confirmed transactions.',category:'Design',skills:['UI design','Figma','Web3'],bounty:40,name:'Maya',hours:12},
    {title:'Pressure-test our Arkiv data model',description:'Review our time-scoped entity model. Check attribute indexing, expiration boundaries, and how concurrent claims should appear to builders. Share a short written recommendation.',category:'Research',skills:['Arkiv','Data modeling'],bounty:60,name:'Ishan',hours:18},
    {title:'Find three teams to test our demo',description:'Help us find builders who can spend five minutes trying the prototype. Collect what confused them, what they expected, and one thing they would change before judging.',category:'Community',skills:['User testing','Community'],bounty:0,name:'Neha',hours:5},
    {title:'Build an accessible task detail panel',description:'Make the detail drawer work well with keyboard navigation and screen readers. Focus management, Escape to close, and responsive layout are the main priorities.',category:'Development',skills:['Accessibility','TypeScript'],bounty:50,name:'Kabir',hours:24},
    {title:'Give our pitch a sharper opening',description:'We have a three-minute demo and a working prototype. Help us tighten the opening so the coordination problem lands in the first twenty seconds. Bring a fresh perspective.',category:'Community',skills:['Storytelling','Pitching'],bounty:0,name:'Riya',hours:6},
    {title:'Map the task lifecycle for our handoff',description:'Document publish, claim, and complete with a compact diagram and a clear explanation of what expires. This example is assigned to you so you can try completing work.',category:'Research',skills:['Documentation','Arkiv'],bounty:25,name:'Zoya',hours:16},
    {title:'Polish the mobile filter experience',description:'Check touch targets, compact search, and the category selector on a phone. This practice task belongs to you; the assigned builder has finished their changes and it is ready to close.',category:'Design',skills:['Mobile UX','Prototyping'],bounty:35,name:'You',hours:20},
  ];
  return examples.map((item,index) => {
    const task=createTask({...item,bountyCurrency:'USDC',durationHours:item.hours,ownerName:item.name},{id:`${demoIdentity(sessionId)}-sample-${index}`,owner:index===7?demoIdentity(sessionId):`example:${index}`,ownerName:item.name,source:'demo',now:now-index*300000});
    if (index===6) return {...task,status:'claimed',assignee:demoIdentity(sessionId)};
    if (index===7) return {...task,status:'claimed',assignee:'example:builder'};
    return task;
  });
}
