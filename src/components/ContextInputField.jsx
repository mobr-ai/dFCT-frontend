import Form from 'react-bootstrap/Form';

function ContextInputField({ providedContext, handleContextInput, t }) {
    return (
        <div className="Submission-input">
            <Form.Label>
                <b><i>{t('optional')}</i></b> {t('additionalContext')}
            </Form.Label>
            <Form.Control
                id="input-context"
                as="textarea"
                onChange={handleContextInput}
                placeholder={t('claimExample')}
                rows={3}
            />
        </div>
    );
}

export default ContextInputField;
