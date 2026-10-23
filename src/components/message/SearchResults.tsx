import type { SearchStatus, WebSource } from '../../types';
import { IconSearch } from '../Icons';
import { SourceMark, sourceHost, useSearchPanel } from './SearchSourcesPanel';

export function SearchResults({ sources = [], status, wip }: { sources?: WebSource[]; status?: SearchStatus; wip: boolean }) {
  const openPanel = useSearchPanel();
  const sites = [...new Map(sources.map((source) => [sourceHost(source), source])).values()].slice(0, 4);
  const label = sources.length ? `搜索到 ${sources.length} 个网页`
    : status === 'error' ? '联网搜索暂不可用'
    : status === 'empty' ? '未搜索到合适内容'
    : status === 'searching' && wip ? '搜索中...'
    : status === 'unverified' ? '未返回搜索来源'
    : '搜索已停止';
  return (
    <div className={`message-sources ${status === 'searching' && wip ? 'searching' : ''}`}>
      <button className="search-step" type="button" disabled={!sources.length} onClick={(event) => openPanel(sources, event.currentTarget)}>
        <IconSearch className="search-step-icon" /><span role="status">{label}</span>
        {sites.length > 0 && <span className="search-site-marks" aria-hidden="true">{sites.map((source) => <SourceMark key={source.url} source={source} />)}</span>}
      </button>
    </div>
  );
}
