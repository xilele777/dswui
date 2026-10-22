import type { ReactNode } from 'react';
import deepseekMark from '../../assets/deepseek-mark.svg';

export function Welcome({ composer }: { composer: ReactNode }) {
  return (
    <div className="welcome">
      <div className="welcome-heading">
        <img className="welcome-mark" src={deepseekMark} alt="" aria-hidden="true" />
        <h1>今天有什么可以帮到你？</h1>
      </div>
      <div className="welcome-composer">{composer}</div>
    </div>
  );
}
