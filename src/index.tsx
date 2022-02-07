import React, { memo, ReactNode, useCallback, useMemo, useState } from "react"

type FormKey<T extends Object> = Extract<keyof T, string>

export type FormSchema<T extends Object> = {
	[key in FormKey<T>]: FormSchemaItem<T>
}

type FormSchemaItem<T> = {
	value: T[FormKey<T>]
	validators?: Array<(values: any) => string | null>
	optional?: boolean
	errors?: string[]
	touched?: boolean
}

interface FormControllers<T> {
	valid: boolean

	updateValue: (key: FormKey<T>, update: T[FormKey<T>]) => void
	setValues: (values: { [key: string]: any }) => void

	getValue: (key: FormKey<T>) => FormSchemaItem<T>

	generateFormInputContainer: (key: FormKey<T>, render: (key: FormKey<T>, value: T[FormKey<T>], updateValue: (key: FormKey<T>, update: T[FormKey<T>]) => void, errors?: string[]) => ReactNode) => JSX.Element

	handleCallback: (callback: (values: T) => void) => void
}

function useForm<T extends Object>(schema: FormSchema<T>): FormControllers<T> {
	const [state, setState] = useState(schema)

	const valid = useMemo(() =>
		Object.keys(state).every(k => {
			const key = k as FormKey<T>

			const hasNoErrors = state[key].errors === undefined || (state[key].errors as string[]).length === 0
			const hasInput = state[key].optional || Boolean(state[key].value)

			const validity = hasNoErrors && hasInput
			return validity
		}), [state])

	const getValue = (key: FormKey<T>) => state[key]

	const updateValue =
		(key: FormKey<T>, update: T[FormKey<T>]) => {
			setState((prevState) => {
				const errors = validateKey(key, update)

				return {
					...prevState,
					[key]: {
						...prevState[key],
						value: update,
						errors: errors,
						touched: true
					}
				}
			})
		}

	const setValues = (values: { [key: string]: any }) => {
		let valueUpdates: FormSchema<any> = {}

		Object.keys(values).forEach(k => {
			const key = k as FormKey<T>
			if (state[key]) {
				const errors = (values[key] && values[key].length > 0) ?
					validateKey(key as FormKey<T>, values[key])
					:
					[]

				valueUpdates[key] = {
					...state[key],
					value: values[key],
					errors: errors
				}
			}
		})
		setState((prevState) => {
			return {
				...prevState,
				...valueUpdates
			}
		})
	}

	const generateFormInputContainer = (
		key: FormKey<T>,
		render:
			(key: FormKey<T>, value: T[FormKey<T>], updateValue: (key: FormKey<T>, update: T[FormKey<T>]) => void, errors?: string[]) => ReactNode
	) => {
		return (
			<FormInputContainer
				value={state[key].value}
			>
				{render(key, state[key].value, updateValue, state[key].errors)}
			</FormInputContainer>

		)
	}

	const validateKey = (key: FormKey<T>, value: T[FormKey<T>]): string[] => {
		let errors: string[] = []

		if (state[key].validators && Array.isArray(state[key].validators)) {
			(state[key].validators as Array<any>).forEach(fn => {
				const errStr = fn(value)
				if (errStr) {
					errors.push(errStr)
				}
			})
		}

		if (typeof state[key] === "number" && Number.isNaN(value)) errors.push(`Input must be a number.`)

		return errors
	}

	const handleCallback = useCallback((callback: (formValues: T) => void) => {
		let payload: any = {}

		Object.keys(state).forEach(k => {
			const key = k as FormKey<T>
			payload[key] = state[key].value
		})

		callback(payload)
	}, [state])

	return {
		valid,
		getValue,
		updateValue,
		setValues,
		generateFormInputContainer,
		handleCallback
	}
}

export default useForm

interface FormInputContainerProps {
	children: ReactNode
	value: any
}
const FormInputContainer = memo((props: FormInputContainerProps) => {
	return <React.Fragment>
		{props.children}
	</React.Fragment>
}, (prevProps, nextProps) => prevProps.value === nextProps.value)
FormInputContainer.displayName = FormInputContainer.name