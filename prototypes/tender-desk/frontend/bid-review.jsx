import { useEffect, useRef, useState } from 'react';
import { Drawer } from '@heroui/react';

export default function BidReview({ pursuit, onSave, onDirtyChange, onBack, formId, children }) {
  const [review, setReview] = useState(pursuit);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const nextRowKey = useRef(pursuit.requirements.length);
  const [rowKeys, setRowKeys] = useState(() => pursuit.requirements.map((_, index) => index));
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  function edit(fields) {
    setReview(current => ({ ...current, ...fields }));
    onDirtyChange(true);
    setFailed(false);
    setMessage('Unsaved changes');
  }

  function updateRow(index, fields) {
    edit({ requirements: review.requirements.map((row, position) => position === index ? { ...row, ...fields } : row) });
  }

  function addRow() {
    const key = nextRowKey.current++;
    setRowKeys(keys => [...keys, key]);
    edit({ requirements: [...review.requirements, { requirement: '', source: '', status: 'unverified', evidence: '', followUp: '' }] });
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFailed(false);
    setMessage('Saving review…');
    try {
      setReview(await onSave(review));
      onDirtyChange(false);
      setMessage('Review saved for the team.');
    } catch (error) {
      setFailed(true);
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <Drawer.Body className="mx-sheet-body">
      {children}
      <form id={formId} className="mx-bid-form" onSubmit={save}>
        <fieldset disabled={saving}>
          <div className="mx-bid-heading">
            <div><h3 ref={heading} tabIndex={-1}>Bid review</h3><p>Owner · {pursuit.owner}</p></div>
            <label><span id={`${formId}-decision`}>Decision</span><select aria-labelledby={`${formId}-decision`} value={review.decision} onChange={event => edit({ decision: event.target.value })}>
              <option value="in-review">In review</option><option value="bid">Bid</option>
              <option value="hold">Hold</option><option value="no-bid">No bid</option>
            </select></label>
          </div>
          <label>Decision reason<textarea rows="2" maxLength={1500} value={review.reason} required={review.decision !== 'in-review'} onChange={event => edit({ reason: event.target.value })} /></label>
          <div className="mx-bid-checks">
            <h4>Requirement checklist</h4>
            {review.requirements.length === 0 && <p>Add the requirements that could decide this bid.</p>}
            {review.requirements.map((row, index) => <fieldset className="mx-bid-check" key={rowKeys[index]}>
              <legend>Requirement {index + 1}</legend>
              <label>Requirement<textarea rows="2" required maxLength={350} value={row.requirement} onChange={event => updateRow(index, { requirement: event.target.value })} /></label>
              <div className="mx-bid-fields">
                <label>Document and page or clause<textarea rows="2" required maxLength={200} value={row.source} onChange={event => updateRow(index, { source: event.target.value })} /></label>
                <label><span id={`${formId}-status-${rowKeys[index]}`}>Status</span><select aria-labelledby={`${formId}-status-${rowKeys[index]}`} value={row.status} onChange={event => updateRow(index, { status: event.target.value })}>
                  <option value="unverified">Unverified</option><option value="met">Met</option><option value="gap">Gap</option>
                </select></label>
              </div>
              <label>MeritX evidence<textarea rows="2" maxLength={600} value={row.evidence} onChange={event => updateRow(index, { evidence: event.target.value })} /></label>
              <label>Follow-up<textarea rows="2" maxLength={500} value={row.followUp} onChange={event => updateRow(index, { followUp: event.target.value })} /></label>
              <button type="button" className="button button--ghost button--sm" aria-label={`Remove requirement ${index + 1}`} onClick={() => {
                setRowKeys(keys => keys.filter((_, position) => position !== index));
                edit({ requirements: review.requirements.filter((_, position) => position !== index) });
              }}>Remove requirement</button>
            </fieldset>)}
            {review.requirements.length < 24 && <button type="button" className="button button--outline button--sm" onClick={addRow}>Add requirement</button>}
          </div>
        </fieldset>
      </form>
    </Drawer.Body>
    <Drawer.Footer className="mx-sheet-footer mx-bid-footer">
      <p className="mx-bid-feedback" data-error={failed} role={failed ? 'alert' : 'status'}>{message}</p>
      <div className="mx-bid-actions">
        <button type="button" className="button button--outline" onClick={onBack} disabled={saving}>Back to notice</button>
        <button type="submit" form={formId} className="button button--primary" disabled={saving}>Save review</button>
      </div>
    </Drawer.Footer>
  </>;
}
