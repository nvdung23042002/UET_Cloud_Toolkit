import os
import sys
import boto3
import configparser
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

ssm = boto3.client("ssm")
secret = boto3.client("secretsmanager")

script_dir = os.path.dirname(os.path.abspath(__file__))

# シークレット出力用ファイル
secret_file = "secret_list.json"


# 設定ファイル読み込み
def read_param_file(environment):
    param_file = os.path.join(script_dir, f"{environment}.ini")
    if not os.path.isfile(param_file):
        sys.exit(f"Configuration file '{environment}.ini' not found.")

    param = configparser.ConfigParser()
    param.read(param_file)
    return param


# Secrets ManagerのARN取得
def get_secret_arn(env, pj_prefix, service_prefix, app_name):
    print("Setting Secrets manager ARN...")

    ssm_name = f"/{env}-{pj_prefix}-{service_prefix}/{app_name}/SecretArn"

    try:
        response = ssm.get_parameter(Name=ssm_name)
        return response["Parameter"]["Value"]
    except (NoCredentialsError, PartialCredentialsError):
        sys.exit("Credentials are not configured properly.")
    except ssm.exceptions.ParameterNotFound:
        sys.exit("Parameter not found.")
    except Exception as e:
        sys.exit(f"Failed to get parameter: {e}")


# シークレットの取得
def get_secret_value(secret_arn):
    print("Getting secret value...")

    try:
        response = secret.get_secret_value(SecretId=secret_arn)
        secret_string = response.get("SecretString")
        if secret_string:
            with open(secret_file, "w", encoding="utf-8") as file:
                file.write(secret_string)
        else:
            sys.exit("No SecretString found.")
        print("Download is complete!")
    except (NoCredentialsError, PartialCredentialsError):
        sys.exit("Credentials are not configured properly.")
    except secret.exceptions.ResourceNotFoundException:
        sys.exit("Secret not found.")
    except Exception as e:
        sys.exit(f"Failed to get secret value: {e}")


# シークレットの登録
def put_secret_value(secret_arn):
    try:
        with open(secret_file, "r", encoding="utf-8") as file:
            secret_string = file.read()
        secret.put_secret_value(SecretId=secret_arn, SecretString=secret_string)
        os.remove(secret_file)
        print("Update is complete!")
    except (NoCredentialsError, PartialCredentialsError):
        sys.exit("Credentials are not configured properly.")
    except FileNotFoundError:
        sys.exit("secrets_list.json file not found.")
    except Exception as e:
        sys.exit(f"Failed to put secret value: {e}")


def main():

    # 引数の有無チェック
    if len(sys.argv) < 2:
        sys.exit("Please set an argument such as dev/stg/prod.")
    environment = sys.argv[1]
    print(f"Your environment is {environment}")

    # 設定ファイル読み込み
    param = read_param_file(environment)

    try:
        env = param["Env"]["ENV"]
        pj_prefix = param["Env"]["PJ_PREFIX"]
        service_prefix = param["Env"]["SERVICE_PREFIX"]
        app_name = param["EcsApp"]["APP_NAME"]
    except KeyError as e:
        print(f"KeyError: The key '{e.args[0]}' is not found")

    # Secrets ManagerのARN取得
    secret_arn = get_secret_arn(env, pj_prefix, service_prefix, app_name)
    print(f"Secrets manager is {secret_arn}")

    choice = input(
        "\nSelect Secret operation:\n[1] Get secret\n[2] Update secret\nEnter number [1 or 2]: "
    ).strip()

    # シークレットの取得
    if choice == "1":
        get_secret_value(secret_arn)
        print(f"Secret output file: {os.path.join(script_dir, secret_file)}")
        print(
            """Please describe as indicated below
{
    "key1":"value",
    "key2":"value"
}"""
        )
    # シークレットの登録
    elif choice == "2":
        put_secret_value(secret_arn)
    else:
        sys.exit("Invalid choice. Please enter 1 or 2.")


if __name__ == "__main__":
    main()
