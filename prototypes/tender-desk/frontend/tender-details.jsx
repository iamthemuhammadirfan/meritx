import { createRoot } from 'react-dom/client';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import BidReview from './bid-review.jsx';

function SourceLinks({ source, links, evidenceId }) {
  const [feedback, setFeedback] = useState('');
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(source.url);
      setFeedback('Address copied.');
    } catch {
      setFeedback('Select the web address to copy it.');
    }
  }
  return (
    <section className="mx-source-strip" aria-labelledby="mx-original-source">
      <h3 id="mx-original-source">Original source</h3>
      {source ? (
        <>
          <div className="mx-source-actions">
            <a className="button button--primary button--sm" href={source.url} target="_blank" rel="noopener noreferrer">{source.label} <span aria-hidden="true">↗</span></a>
            <Button variant="outline" size="sm" onPress={copyAddress}>Copy address</Button>
          </div>
          <a className="mx-source-url" href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
          {feedback && <p className="mx-copy-status" role="status">{feedback}</p>}
        </>
      ) : <p>The feed did not provide a source address for this notice.</p>}
      {links.length > 0 && <ul className="mx-source-documents">
        {links.map(({ url, label }) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a></li>)}
      </ul>}
      {evidenceId && <a className="mx-source-evidence" href={`/api/evidence/${evidenceId}.png`} target="_blank" rel="noopener noreferrer">View private ad image <span aria-hidden="true">↗</span></a>}
    </section>
  );
}

function TenderDetails({ detail, descriptionId, onToggleSave, onPursue, onSaveReview, onDirtyChange, confirmClose }) {
  const { tender, facts, source, links, evidenceId, saved, dateText, pursuit, openReview, retained } = detail;
  const match = tender.matches[0];
  const warning = tender.deadlineWarning || tender.detailWarning;
  const formId = useId();
  const [reviewOpen, setReviewOpen] = useState(openReview);
  const [pursuing, setPursuing] = useState(false);
  const [pursuitError, setPursuitError] = useState('');
  async function openBidReview() {
    if (pursuing) return;
    setPursuing(true);
    setPursuitError('');
    try {
      if (!pursuit) await onPursue(tender.id);
      setReviewOpen(true);
    } catch (error) { setPursuitError(error.message); }
    finally { setPursuing(false); }
  }
  function closeReview() {
    if (confirmClose()) setReviewOpen(false);
  }
  return (
    <>
      <Drawer.Header className="mx-sheet-head">
        <div className="mx-sheet-context"><span>{tender.newspaper ? 'Newspaper candidate' : tender.region || 'Official notice'}</span>{tender.reference && <span>{tender.reference}</span>}</div>
        <Drawer.Heading className="mx-sheet-title">{tender.title}</Drawer.Heading>
        <p className="mx-sheet-description" id={descriptionId}>{tender.buyer || tender.sourceName}</p>
        <Drawer.CloseTrigger className="mx-sheet-close" aria-label="Close tender details" />
      </Drawer.Header>
      {reviewOpen && pursuit ? <BidReview pursuit={pursuit} onSave={onSaveReview} onBack={closeReview}
        onDirtyChange={onDirtyChange} formId={formId}>
        {retained && <p className="mx-sheet-warning">This notice is absent from the current feed. Verify the saved deadline and documents with the issuer.</p>}
        {warning && <p className="mx-sheet-warning">{warning}</p>}
        <div className="mx-review-source">
          <p><strong>Submission deadline</strong> · {facts[0][1]}</p>
          <details><summary>Tender documents</summary><SourceLinks source={source} links={links} evidenceId={evidenceId} /></details>
        </div>
      </BidReview> : <><Drawer.Body className="mx-sheet-body">
        {retained && <p className="mx-sheet-warning">This notice is absent from the current feed. Verify the saved deadline and documents with the issuer.</p>}
        {tender.reviewStatus === 'needs-review' && <p className="mx-sheet-warning">Review the newspaper ad before relying on its requirements or submission date.</p>}
        {warning && <p className="mx-sheet-warning">{warning}</p>}
        <dl className="mx-tender-facts">
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <SourceLinks key={tender.id} source={source} links={links} evidenceId={evidenceId} />
        {match && <section className="mx-sheet-section">
          <h3>MeritX service match</h3>
          <p>{tender.newspaper ? 'Extracted ad text' : 'Notice title'} contains “{match.keyword}”, matching {match.category}. Check the source for specifications and eligibility.</p>
        </section>}
        {tender.ocrText && <details className="mx-sheet-section">
          <summary>Extracted ad text</summary><p className="mx-ocr" dir="auto">{tender.ocrText}</p>
        </details>}
        {(tender.amendmentFlag || tender.changes.length > 0) && <details className="mx-sheet-section">
          <summary>Amendments and collection history</summary>
          {tender.amendmentFlag && <p>The source flags this notice as an amendment or corrigendum.</p>}
          <ul>
            {tender.changes.flatMap(change => Object.entries(change.fields).map(([field, value]) => (
              <li key={change.recordedAt + field}>{dateText(change.recordedAt, true)} · {field === 'closingAt' ? 'Deadline' : field} changed from “{String(value.before ?? 'unlisted')}” to “{String(value.after ?? 'unlisted')}”.</li>
            )))}
          </ul>
        </details>}
      </Drawer.Body>
      <Drawer.Footer className="mx-sheet-footer mx-bid-footer">
        {pursuitError && <p className="mx-bid-feedback" data-error="true" role="alert">{pursuitError}</p>}
        <div className="mx-bid-actions">
          <Button variant="outline" aria-pressed={saved} onPress={() => onToggleSave(tender.id)}>
            {saved ? 'Remove from shortlist' : 'Add to shortlist'}
          </Button>
          <Button variant="primary" isDisabled={pursuing} onPress={openBidReview}>{pursuing ? 'Opening review…' : pursuit ? 'Open bid review' : 'Pursue'}</Button>
        </div>
      </Drawer.Footer></>}
    </>
  );
}

function TenderDrawer({ detail, onClose, onAfterClose, onToggleSave, onPursue, onSaveReview }) {
  const descriptionId = useId();
  const wasOpen = useRef(false);
  const dirty = useRef(false);
  const isOpen = Boolean(detail);
  useEffect(() => {
    if (wasOpen.current && !isOpen) requestAnimationFrame(onAfterClose);
    wasOpen.current = isOpen;
  }, [isOpen, onAfterClose]);
  function confirmClose() {
    if (dirty.current && !window.confirm('Discard unsaved changes to this review?')) return false;
    dirty.current = false;
    return true;
  }
  if (!detail) return null;
  return (
    <Drawer>
      <Drawer.Backdrop isOpen={isOpen} onOpenChange={open => {
        if (!open && confirmClose()) onClose();
      }}>
        <Drawer.Content placement="right" className="mx-drawer-content">
          <Drawer.Dialog className="mx-drawer-dialog" aria-describedby={descriptionId}>
            <TenderDetails key={detail.tender.id} detail={detail} descriptionId={descriptionId} onToggleSave={onToggleSave}
              onPursue={onPursue} onSaveReview={onSaveReview}
              onDirtyChange={value => { dirty.current = value; }} confirmClose={confirmClose} />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}

const root = createRoot(document.getElementById('mx-tender-sheet'));
globalThis.renderTenderSheet = props => {
  root.render(<TenderDrawer {...props} />);
};
