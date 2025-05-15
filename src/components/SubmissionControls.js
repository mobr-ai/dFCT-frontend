import Button from 'react-bootstrap/Button';

function SubmissionControls({ loading, processContent, files, urls, t }) {
    const allCompleted = files && files.length > 0 && files.every(f => f.completed);

    return (
        <Button
            id="input-process-button"
            variant="dark"
            onClick={!loading ? processContent : null}
            disabled={loading || (!allCompleted && urls.length === 0)}
        >
            {t('analyzeButton')}
        </Button>
    );
}

export default SubmissionControls;
