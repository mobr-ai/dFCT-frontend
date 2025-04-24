import logo from './icons/logo.svg';
import "./styles/LoadingPage.css"

function LoadingPage(props) {

    const switchRender = (type, style) => {
        switch (type) {
            case 'simple':
                return (<div style={style || { alignItems: 'center', alignSelf: 'center' }} className="LoadingPage-simple" alt="loading sign"></div>)
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
                return (<img style={style || { alignItems: 'center', alignSelf: 'center' }} src={logo} className="LoadingPage-magnifier" alt="loading sign"></img>)
        }
    }

    return (
        switchRender(props.type, props.style)
    )
}

export default LoadingPage;
