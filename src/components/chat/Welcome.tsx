import { useState, type ReactNode } from 'react';
import deepseekMark from '../../assets/deepseek-mark.svg';
import { pickWelcomeMessage } from './welcomeMessages';

export function Welcome({ composer }: { composer: ReactNode }) {
  const [greeting] = useState(() => pickWelcomeMessage());
  return (
    <div className="welcome">
      <div className="welcome-heading">
        <img className="welcome-mark" src={deepseekMark} alt="" aria-hidden="true" />
        <h1>{greeting}</h1>
      </div>
      <div className="welcome-composer">{composer}</div>
    </div>
  );
}
