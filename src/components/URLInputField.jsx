import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';

function URLInputField({ fetching, handleURLInput, t }) {
    return (
        <div className="Submission-input-url mb-3">
            <InputGroup>
                <InputGroup.Text id="input-url-label">WWW</InputGroup.Text>
                <Form.Control id="input-url-text" aria-label="Add an URL" aria-describedby="input-url-help-msg" />
                <Button
                    id="input-url-button"
                    variant="dark"
                    onClick={!fetching ? handleURLInput : null}
                    disabled={fetching}
                >
                    {fetching ? t('loadingURL') : t('addURL')}
                </Button>
            </InputGroup>
            <Form.Text id="input-url-help-msg" muted />
        </div>
    );
}

export default URLInputField;
