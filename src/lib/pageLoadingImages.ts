interface InitialImageCandidate {
  loading: string;
  fetchPriority: string;
  top: number;
  bottom: number;
  viewportHeight: number;
  deferredBackground?: boolean;
}

/**
 * 初期ローディング画面が待つべき画像かを判定する。
 * 画面外の lazy 画像や、トップで先読みする背景画像まで待つと、表示済みのページを
 * 最大待機時間まで覆い続けてしまうため、最初の画面に必要な画像だけを対象にする。
 */
export function shouldWaitForInitialImage(candidate: InitialImageCandidate) {
  if (candidate.deferredBackground || candidate.loading === 'lazy') return false;
  if (candidate.fetchPriority === 'high') return true;

  const preloadMargin = Math.max(candidate.viewportHeight * 0.25, 120);
  return candidate.top < candidate.viewportHeight + preloadMargin
    && candidate.bottom > -preloadMargin;
}
