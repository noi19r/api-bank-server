const crypto = require('crypto')
const axios = require('axios')
const { newError, uuidv4, md5 } = require('../helpers/routerHelpers')
const dayjs = require('../config/day')
const Bank = require('../models/Bank')
const qs = require('qs')
const NodeRSA = require('node-rsa')
const config = {
	publicKey:
		'-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLenQHmHpaqYX4IrRVM8H1uB21\nxWuY+clsvn79pMUYR2KwIEfeHcnZFFshjDs3D2ae4KprjkOFZPYzEWzakg2nOIUV\nWO+Q6RlAU1+1fxgTvEXi4z7yi+n0Zs0puOycrm8i67jsQfHi+HgdMxCaKzHvbECr\n+JWnLxnEl6615hEeMQIDAQAB\n-----END PUBLIC KEY-----',

	public:
		'-----BEGIN RSA PUBLIC KEY-----\r\nMIIBCgKCAQEAtJrooyqaW0uaHUrBcsolAr+O9RRu/BdUp1N2Rcb7b58w1TMGqMGM\r\n2dyHzIIEwsPP1XwYf5Qo3oTkDGB8HD4FgTQOHydponYirfoZ0kGLCitz8CPv2dzg\r\nimbScm3sBKLNjHL6Y5yiJ4um/Pz0XUWF1LuEeI4ChDxHDjok+trSW/PiWIFW0P6v\r\nqEWwch3Hpv75/f0zB1lmKxuwmjo08JwR+y596UdnU/n2ZwjgyJ53yoXqn6i9aKsh\r\naJiDHflgRndxmXRf5TfcZzpz33UltIb02PclNozw7lyROMr9IBqH4Vr06afZgmgs\r\nrbz0L3VEryLdNW6JUyf0ZH+KUhvL4bAmWQIDAQAB\r\n-----END RSA PUBLIC KEY-----\r\n',
	private:
		'-----BEGIN RSA PRIVATE KEY-----\r\nMIIEowIBAAKCAQEAtJrooyqaW0uaHUrBcsolAr+O9RRu/BdUp1N2Rcb7b58w1TMG\r\nqMGM2dyHzIIEwsPP1XwYf5Qo3oTkDGB8HD4FgTQOHydponYirfoZ0kGLCitz8CPv\r\n2dzgimbScm3sBKLNjHL6Y5yiJ4um/Pz0XUWF1LuEeI4ChDxHDjok+trSW/PiWIFW\r\n0P6vqEWwch3Hpv75/f0zB1lmKxuwmjo08JwR+y596UdnU/n2ZwjgyJ53yoXqn6i9\r\naKshaJiDHflgRndxmXRf5TfcZzpz33UltIb02PclNozw7lyROMr9IBqH4Vr06afZ\r\ngmgsrbz0L3VEryLdNW6JUyf0ZH+KUhvL4bAmWQIDAQABAoIBADqe7VPIyEFJ0MQh\r\nN5kis9CojKZP85YvnHKTTJhpdcNNUHRjE45DBIzSX+GpchIlrJgGp40BciKHz92U\r\nk7Q3DWJamxrRmB/7aFZAD5GHZLHwWLlhcMCuSNOjfDtYInt+vGkSCOO8O4XKdnE3\r\nSbncjwv1sZHPxlFVn1qm1Mn3rL/bZcnZBpHATp+pItXRK4wFZzUeqeXztdnsKH4o\r\nJQo79cp98J0JOxfbFzYvlo/1XuOpnlGykfrcNqt5ZCOmNt1/mb5eFPCZq16+sAMG\r\nsCErx+V0A0AR1oj6/KCzbz8cSNw7MnJQex/8sQl96UidoRBdZ16FK5luMf/tVWmN\r\nH9EjPAECgYEA2nksozuirpg2Iwy7L0eh9r2ap1uanYyd6NEGh9e8tIWnwbXWMixG\r\ne3J1kCe15mBbsf/251lHxKndsCE4Ag3KSUKeYCxKu72kIKa/oLs4mjxhpLhBzqfj\r\nYk9hp5Y3ouVkGft0nFkw1Rz8UUt8ir4ewpUoTTYe8jTWmvjYi0eVjokCgYEA06CS\r\nmjquH63cft7vPTtwzo7HpeYeJfCXXGjSNKBSamD5dbDFvLMhunuR6PGjKpQisBA7\r\nRnIwmyLbXtEdFu6PzWHQR15AEgX8+Jq8BzzxDIQtzah/bdGTNO7NXcms4i+duAMO\r\nlpi0+I/mDffRVDN3KHFVOn5ZdGSewvp+7XCSZVECgYAbdyZccw/VoT8VEvGpVPkQ\r\nmu+JYKPEcLwdW8HVbBLGIxNe7+w4rIZD2LTc5ZEhoDWG4CX7GadDGxPKo7J116P5\r\np81fS9ItXf73N99ZZpAMG9Eusxda0pJsdoxRVDo0WWBHP+x+B1xzPkyeL749dv9I\r\n+RVy933WdzwPiX83q00q+QKBgQCKfaJy28PnZ1fMjwfxAl0oT7fHkXhZS8FB8Dbf\r\nyaslgqC9rBk7C98eso8h6j/lNVwd7AFecIvuejklK6PlxejFdyVeDwfOw6xw5JH4\r\nCqGUl0uCMqpxq5yyHzS2E6zXuGF2ckmxs+16XHEo4uxSNfvcs44a4WSZDt/2qQc3\r\nS1wCgQKBgDNEcLbf6N6JUrfhqsQcXOV+2FM3pQ9MChaMCa4JWLjx5Bg68+eTXJ4x\r\nXr5CcJP5El6dy/Jm43Yq8b6VsKe+ttVwalvlY9/H9V8jgdsgd68hLWHrhX6axgHM\r\nFgVty49ujBslHahMLcJFNbEHaKiUMGXcnQakz9vcDkX2Fyz9YHBn\r\n-----END RSA PRIVATE KEY-----\r\n',
	key: '123456789012345678901234567890aa',
}
function alphabeticalSort(a, b) {
	return a.localeCompare(b)
}

const keyRSA = new NodeRSA(config.publicKey)
const encryptRSA = (body) => {
	return keyRSA.encrypt(body, 'base64')
}

const encryptData = (data) => {
	data.signature = md5(
		qs.stringify(data, {
			arrayFormat: 'repeat',
			sort: alphabeticalSort,
		})
	)

	return encryptRSA(JSON.stringify(data))
}

const randomString = (length) => {
	var result = ''
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	var charactersLength = characters.length
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}
	return result
}

function isObject(obj) {
	return obj !== undefined && obj !== null && obj.constructor == Object
}

const isJson = (str) => {
	if (!str)
		newError({
			message: 'Server VietinBank đang lỗi dữ liệu, vui lòng thử lại sau.',
			status: 400,
		})

	if (isObject(str)) {
		return str
	} else {
		try {
			return JSON.parse(str)
		} catch (e) {
			return str
		}
	}
}

const postAxios = async (url, data, headers) => {
	let response = await axios.post(url, data, {
		headers: {
			...headers,
			'Content-Type': 'application/json',
		},
		validateStatus: () => true,
		timeout: 4000,
	})

	if (response.data.error == true) {
		if (headers._id && response.data.errorCode == '96') {
			await Bank.findByIdAndUpdate(headers._id, {
				newLogin: true,
			})
		}
		newError({
			status: 400,
			message: response.data.errorMessage || response.data,
		})
	}

	let responseDecrypt = isJson(response.data)
	if (headers._id && responseDecrypt.errorCode == '96') {
		await Bank.findByIdAndUpdate(headers._id, {
			newLogin: true,
		})
	}
	if (responseDecrypt.error == true) {
		newError({
			message: responseDecrypt.errorMessage || 'Có lỗi trong quá trình xử lý',
			status: 400,
		})
	}

	return { response: responseDecrypt, headers: response.headers }
}

const Login = async (req, res, next) => {
	let { captchaId, resultCaptcha } = await captcha()
	let { username, _id } = req.bank
	let { password } = req.value.body
	let data = {
		userName: username,
		accessCode: password,
		captchaCode: resultCaptcha,
		captchaId,
		clientInfo: '171.250.164.37;Windows-10',
		browserInfo: 'Chrome-101.0495167',
		lang: 'vi',
		requestId: `${randomString(12).toUpperCase()}|${new Date().getTime()}`,
	}

	let { response } = await postAxios(
		'https://api-ipay.vietinbank.vn/ipay/wa/signIn',
		{ encrypted: encryptData(data) },
		{
			_id: false,
		}
	)
	let sessionId = response.sessionId

	await Bank.findByIdAndUpdate(_id, {
		sessionId,
		newLogin: false,
	})

	req.bank.sessionId = sessionId
	req.bank.newLogin = false
}

const GET_BALANCE = async (req, res, next) => {
	let { newLogin, _id } = req.bank
	if (newLogin) await Login(req, res, next)
	let data = {
		sessionId: req.bank.sessionId,
		lang: 'vi',
		requestId: `${randomString(12).toUpperCase()}|${new Date().getTime()}`,
	}
	let { response, headers } = await postAxios(
		'https://api-ipay.vietinbank.vn/ipay/wa/getEntitiesAndAccounts',
		{ encrypted: encryptData(data) },
		{
			_id,
		}
	)

	response.accounts.forEach(function (v) {
		delete v.accountState.serviceLimits
	})
	return res.status(200).json({
		success: true,
		message: 'Thành công',
		data: response.accounts,
	})
}

const GET_TRANSACTION = async (req, res, next) => {
	let { accountNumber } = req.value.body
	let { newLogin, _id } = req.bank

	if (newLogin) await Login(req, res, next)

	let dayNow = new Date()
	let toDate = dayjs(dayNow).format('YYYY-MM-DD')
	let fromDate = dayjs(dayNow.setDate(dayNow.getDate() - 3)).format('YYYY-MM-DD')
	let data = {
		accountNumber,
		startDate: fromDate,
		endDate: toDate,
		tranType: '',
		maxResult: '999999999',
		pageNumber: 0,
		searchKey: '',
		searchFromAmt: '',
		searchToAmt: '',
		lang: 'vi',
		requestId: `${randomString(12).toUpperCase()}|${new Date().getTime()}`,
		sessionId: req.bank.sessionId,
	}
	let { response, headers } = await postAxios(
		'https://api-ipay.vietinbank.vn/ipay/wa/getHistTransactions',
		{ encrypted: encryptData(data) },
		{
			_id,
		}
	)
	return res.status(200).json({
		success: true,
		message: 'Thành công',
		data: response.transactions,
	})
}

const captcha = async () => {
	let captchaId = randomString(9)

	let imgBase64 = await axios.get(`https://api-ipay.vietinbank.vn/api/get-captcha/${captchaId}`, {
		validateStatus: () => true,
		timeout: 2000,
		responseType: 'arraybuffer',
	})
	if (imgBase64.status != 200)
		newError({
			status: 400,
			message: 'Capcha VietinBank đang gặp vấn đề, vui lòng thử lại sau.',
		})
	let imageBase64 = Buffer.from(imgBase64.data, 'binary').toString('base64')

	let { data: resultCaptcha, status } = await axios.post('http://103.154.100.194:5000/vtb', imageBase64, {
		validateStatus: () => true,
		timeout: 2000,
	})

	resultCaptcha = `${resultCaptcha}`
	if (status != 200 || resultCaptcha.length != 6)
		newError({
			message: 'Server Captcha đang có vấn đề vui lòng thử lại sau.',
			status: 500,
		})
	return { captchaId, resultCaptcha }
}

module.exports = {
	Login,
	GET_BALANCE,
	GET_TRANSACTION,
}
