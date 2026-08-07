import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !value.trim()) {
            return false;
          }

          const parsed = new Date(value);
          if (Number.isNaN(parsed.getTime())) {
            return false;
          }

          const inputDate = new Date(parsed);
          inputDate.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          return inputDate.getTime() <= today.getTime();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be in the future`;
        },
      },
    });
  };
}