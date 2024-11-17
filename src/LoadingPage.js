import logo from './logo.svg';
import "./LoadingPage.css"

function LoadingPage(props) {

    const switchRender = (type) => {
        switch (type) {
            case 'simple':
                return (<div style={{ alignItems: 'center', alignSelf: 'center' }} className="loader" alt="loading sign"></div>)
            case 'ring':
                return (
                    <div className="loading-ring"><div></div><div></div><div></div><div></div></div>
                )
            case 'magnifier':
                return (
                    <div className="loading-spinner">
                        <div className="loading-magnifier-icon">
                            <div>
                                <div>
                                    <div></div>
                                    <div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            default:
                return (<img style={{ alignItems: 'center', alignSelf: 'center' }} src={logo} className="Breakdown-loading" alt="loading sign"></img>)
        }
    }

    return (
        switchRender(props.type)
    )
}

export default LoadingPage;
