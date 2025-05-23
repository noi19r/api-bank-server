const { newError, uuidv4 } = require('../helpers/routerHelpers')
const Bank = require('../models/Bank')
const Deck = require('../models/Deck')
const Transaction = require('../models/Transaction')
const createImei = async (req, res, next) => {
	if (!req.bank) req.bank = {}

	if (!req.bank.imei) req.bank.imei = (req.deck && req.deck.imei) || uuidv4()

	let { bank } = req.value.params
	let { phone } = req.value.body

	if (await Bank.findOne({ bank, phone, status: { $nin: [99, 3] } }))
		newError({
			status: 400,
			message: 'Tài khoản này đã tồn tại trong hệ thống.',
		})

	next()
}

const SEND_OTP = async (req, res, next) => {
	const deck = req.deck
	const { _id } = req.user
	let { imei } = req.bank
	let { bank } = req.value.params
	let { phone } = req.value.body

	let newBank = null

	let check = await Bank.findOne({ phone, bank })
	if (check)
		newBank = await Bank.findByIdAndUpdate(check._id, {
			status: 99,
		})
	else {
		newBank = new Bank({ bank, phone, imei, owner: _id, token: uuidv4(), decks: deck._id, status: 99 })
		await newBank.save()
	}

	await Deck.findByIdAndUpdate(deck._id, {
		banks: newBank._id,
	})
	return res.status(200).json({
		success: true,
		message: 'Lấy OTP thành công.',
		data: {
			_id: newBank._id,
		},
	})
}

const CONFIRM_OTP = async (req, res, next) => {
	return res.status(200).json({
		success: true,
		message: 'Thêm tài khoản thành công.',
		data: {},
	})
}

const CHECK_MONEY = async (req, res, next) => {
	let { balance, phone } = req.bank
	let { amount, password, numberPhone } = req.value.body
	if (amount > balance)
		newError({
			status: 400,
			message: 'Tài khoản của bạn không đủ số dư.',
		})
	if (password != req.bank.password)
		newError({
			status: 400,
			message: 'Mật khẩu của bạn không chính xác.',
		})
	if (numberPhone == phone)
		newError({
			status: 400,
			message: 'Tài khoản nhận phải khác tài khoản gửi',
		})
	next()
}

const GET_NAME_TRANFER = async (req, res, next) => {
	return res.status(200).json({
		success: true,
		message: 'Thành công',
		data: { ...req.info },
	})
}

const GET_BALANCE = async (req, res, next) => {
	return res.status(200).json({
		success: true,
		message: 'Thành công',
		data: { balance: req.bank.balance },
	})
}

const GET_TRANSACTION = async (req, res, next) => {
	const { _id } = req.bank

	let page = req.query.page * 1 || 1
	let limit = req.query.limit * 1 || 5
	let skip = limit * (page - 1)

	const result = await Promise.allSettled([
		Transaction.find(
			{
				banks: _id,
				status: true,
			},
			{ io: 1, transId: 1, partnerId: 1, partnerName: 1, amount: 1, postBalance: 1, time: 1, comment: 1, _id: 0, info: 1 }
		)
			.limit(limit)
			.skip(skip)
			.sort({
				time: -1,
			}),
		Transaction.countDocuments({
			banks: _id,
			status: true,
		}),
	])
	const data = result[0].status === 'fulfilled' ? result[0].value : []
	const total = result[1].status === 'fulfilled' ? result[1].value : 0

	return res.status(200).json({ success: true, data, total })
}

module.exports = { createImei, SEND_OTP, CONFIRM_OTP, CHECK_MONEY, GET_BALANCE, GET_TRANSACTION, GET_NAME_TRANFER }
