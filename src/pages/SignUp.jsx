import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
// ALert 
import {toast} from 'react-toastify'

// Auth 
import {
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile
} from 'firebase/auth'

import {setDoc, doc, serverTimestamp} from 'firebase/firestore'
import { db } from '../firebase.config'
import {ReactComponent as ArrowRightIcon} from '../assets/svg/keyboardArrowRightIcon.svg' 
import visibilityIcon from '../assets/svg/visibilityIcon.svg'
import OAuth from '../components/OAuth'

function SignUp() {

  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '', 
    password: ''
  })

  const {name, email, password} = formData

  const navigate = useNavigate()

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.id]: e.target.value
    }))
  }

  // Form Submit 
  const onSubmit = async (e) => {
    e.preventDefault()

    try {
      const auth = getAuth()

      // Register the user and return promise
      const userCredential = await createUserWithEmailAndPassword 
      (
        auth, 
        email, 
        password
      )
      // Get the user credentials 
      const user = userCredential.user

      updateProfile(auth.currentUser, {
        displayName: name,
      })

      const formDataCopy = {...formData}
      delete formDataCopy.password
      formDataCopy.timestamp = serverTimestamp()

      // Update the database and add to 'users' collection 
      await setDoc( doc(db, 'users', user.uid), formDataCopy)

      navigate('/profile')

    } catch (error) {
      toast.error('Something went wrong with registration')
    }
  }

  return (
    <>
      <div className="pageContainer">
        <header>
          <p className="pageHeader">Welcome Back!</p>
        </header>

        <main>
          <form onSubmit={onSubmit}>
            <input 
              type="text" 
              value={name}
              id="name" 
              className='nameInput'
              placeholder='Name'
              onChange={onChange}
            />
            <input 
              type="email" 
              value={email}
              id="email" 
              className='emailInput'
              placeholder='Email'
              onChange={onChange}
            />
            <div className="passwordInputDiv">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className='passwordInput' 
                placeholder='Password' 
                id='password'
                value={password}
                onChange={onChange}
              />

              <img 
                src={visibilityIcon}
                alt="Show" 
                className="showPassword" 
                onClick={() => setShowPassword((prevState) => !prevState )} 
              />
              
            </div>

            {/* <Link to='/forgot-password' className='forgotPasswordLink'>Forgot Password?</Link> */}

            <div className="signUpBar">
              <p className="signUpText">Sign Up</p>
              <button className="signUpButton">
                <ArrowRightIcon fill='#ffffff' width='34px' height='34px' />
              </button>
            </div>
          </form>

          {/* OAuth  */}
          <Link to='/sign-in' className='registerLink'>Sign In Instead</Link>
          <OAuth />

        </main>
      </div>
    </>
  )
}

export default SignUp