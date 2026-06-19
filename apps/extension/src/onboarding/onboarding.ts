import { ONBOARDING_STEPS } from '@ase/core';

const stepTitle = document.getElementById('step-title')!;
const stepBody = document.getElementById('step-body')!;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const stepCounter = document.getElementById('step-counter')!;

let stepIndex = 0;

function renderStep(): void {
  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  stepTitle.textContent = step.title;
  stepCounter.textContent = `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`;
  stepBody.replaceChildren();

  const body = document.createElement('p');
  body.textContent = step.body;
  stepBody.append(body);

  if (step.links?.length) {
    const linksWrap = document.createElement('div');
    linksWrap.className = 'step-links';
    for (const link of step.links) {
      const anchor = document.createElement('a');
      anchor.className = 'step-link';
      anchor.href = link.href;
      anchor.textContent = link.label;
      if (link.external) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
      linksWrap.append(anchor);
    }
    stepBody.append(linksWrap);
  }

  backBtn.hidden = stepIndex === 0;
  nextBtn.textContent = isLast ? 'Finish' : 'Next';
}

async function finish(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'COMPLETE_ONBOARDING' });
  const practiceUrl = chrome.runtime.getURL('src/practice/practice.html');
  await chrome.tabs.create({ url: practiceUrl });
  window.close();
}

backBtn.addEventListener('click', () => {
  if (stepIndex > 0) {
    stepIndex -= 1;
    renderStep();
  }
});

nextBtn.addEventListener('click', () => {
  if (stepIndex < ONBOARDING_STEPS.length - 1) {
    stepIndex += 1;
    renderStep();
    return;
  }
  void finish();
});

renderStep();
